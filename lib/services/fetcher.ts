// File: /lib/services/fetcher.ts

import axios from 'axios';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';

// MongoDB and Models - ensure paths are correct
// If fetcher.ts is in /lib/services/, and models are in /models/
// and mongodb/index.ts is in /lib/mongodb/
import dbConnect from '../mongodb'; // Corrected: Assumes dbConnect is in /lib/mongodb/
import Article, { IArticle } from '../../models/Article';
import Source, { ISource } from '../../models/Source';
import FetchRunLog, { IFetchRunLog } from '../../models/FetchRunLog'; // Import for logging

// --- Interface Definitions (should be at the top or imported) ---

export interface SourceToFetch {
    url: string;
    type: 'rss' | 'html';
    name: string;
}

export interface ItemError { // For ProcessingSummary
    itemTitle?: string;
    itemLink?: string;
    message: string;
}

export interface ProcessingSummary {
    sourceUrl: string;
    sourceName: string;
    type: 'rss' | 'html';
    status: 'success' | 'partial_success' | 'failed'; // Status for a single source processing
    message: string;
    itemsFound: number;
    itemsProcessed: number;
    newItemsAdded: number;
    itemsSkipped: number;
    errors: ItemError[]; // Array of ItemError
    fetchError?: string;
}

// Result of processing ALL enabled sources
export interface OverallFetchRunResult {
    startTime: Date;
    endTime: Date;
    // Updated status enum for the overall run, matching FetchRunLog
    status: 'completed' | 'completed_with_errors' | 'failed' | 'in-progress'; // 'no_sources_found' will be handled by message
    totalSourcesAttempted: number;
    totalSourcesSuccessfullyProcessed: number;
    totalSourcesFailedWithError: number;
    totalNewArticlesAddedAcrossAllSources: number;
    detailedSummaries: ProcessingSummary[];
    orchestrationErrors: string[];
    logId?: string;
}

// --- Helper Functions ---
const rssParser = new Parser();

// --- Core Function for Processing a Single Source ---
export async function fetchParseAndStoreSource( // Make sure this is EXPORTED
    source: SourceToFetch
): Promise<ProcessingSummary> {
    const summary: ProcessingSummary = {
        sourceUrl: source.url,
        sourceName: source.name,
        type: source.type,
        status: 'failed', // Default to failed
        message: '',
        itemsFound: 0,
        itemsProcessed: 0,
        newItemsAdded: 0,
        itemsSkipped: 0,
        errors: [],
    };

    try {
        await dbConnect();
        // console.log(`Fetcher: DB connected for source ${source.name}`);

        const response = await axios.get(source.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': source.type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            timeout: 15000,
        });
        const rawContent = response.data;

        if (source.type === 'rss') {
            const parsedFeed = await rssParser.parseString(rawContent);
            summary.itemsFound = parsedFeed.items?.length || 0;
            // summary.message = `Found ${summary.itemsFound} items in RSS feed.`; // Will be set more accurately later

            if (parsedFeed.items && parsedFeed.items.length > 0) {
                for (const item of parsedFeed.items) {
                    summary.itemsProcessed++;
                    const normalizedLink = item.link?.trim();
                    const itemTitle = item.title?.trim();

                    if (!normalizedLink) {
                        // console.warn(`Fetcher: RSS item from ${source.name} missing link. Title: ${itemTitle || 'N/A'}`);
                        summary.errors.push({ itemTitle, message: 'Item missing link.' });
                        continue;
                    }
                    try {
                        let existingArticle: IArticle | null = null;
                        if (item.guid) {
                            existingArticle = await Article.findOne({ guid: item.guid });
                        }
                        if (!existingArticle && normalizedLink) {
                            existingArticle = await Article.findOne({ link: normalizedLink });
                        }

                        if (existingArticle) {
                            summary.itemsSkipped++;
                        } else {
                            const newArticleDoc = new Article({
                                title: itemTitle || 'Untitled Article',
                                link: normalizedLink,
                                sourceName: source.name,
                                publishedDate: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
                                descriptionSnippet: item.contentSnippet || item.content?.substring(0, 300),
                                guid: item.guid,
                                fetchedAt: new Date(),
                                isRead: false,
                                isStarred: false,
                                categories: item.categories,
                            });
                            await newArticleDoc.save();
                            summary.newItemsAdded++;
                        }
                    } catch (dbError: any) {
                        // console.error(`Fetcher: DB error for item "${itemTitle || normalizedLink}":`, dbError.message);
                        summary.errors.push({ itemTitle, itemLink: normalizedLink, message: dbError.message });
                    }
                }
            }
            // Set status and message for RSS
            if (summary.errors.length > 0) {
                summary.status = 'partial_success';
                summary.message = `Processed ${summary.itemsProcessed} RSS items with ${summary.errors.length} errors. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
            } else if (summary.itemsFound === 0 && summary.itemsProcessed === 0) {
                summary.status = 'success';
                summary.message = "No items found in RSS feed.";
            } else {
                summary.status = 'success';
                summary.message = `Successfully processed ${summary.itemsProcessed} RSS items. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
            }


        } else if (source.type === 'html') {
            const $ = cheerio.load(rawContent);
            const pageTitle = $('title').text();
            summary.itemsFound = 1; // Basic HTML processing
            summary.itemsProcessed = 1;
            summary.message = `HTML page "${pageTitle}" fetched. Full article extraction & saving not yet implemented for individual articles.`;
            summary.status = 'success'; // For fetching the page itself
            // console.log(`Fetcher: HTML page "${pageTitle}" processed (basic).`);
        }

    } catch (error: any) {
        // console.error(`Fetcher: Error processing source ${source.name} (${source.url}):`, error.message);
        summary.fetchError = error.message;
        summary.message = `Failed to fetch or process source: ${error.message}`;
        summary.status = 'failed'; // Explicitly set to failed on fetch error
    }
    return summary;
}

// --- Orchestrator Function ---
export async function processAllEnabledSources(): Promise<OverallFetchRunResult> { // Make sure this is EXPORTED
    const startTime = new Date();
    const detailedSummaries: ProcessingSummary[] = [];
    let totalNewArticlesAddedAcrossAllSources = 0;
    let totalSourcesSuccessfullyProcessed = 0;
    let totalSourcesFailedWithError = 0;
    const orchestrationErrors: string[] = [];
    let runStatus: OverallFetchRunResult['status'] = 'failed'; // Default overall run status
    let logId: string | undefined = undefined;

    console.log('Orchestrator: Starting fetch run...');
    let currentRunLog: IFetchRunLog | null = null;

    try {
        await dbConnect();
        currentRunLog = new FetchRunLog({
            startTime,
            status: 'in-progress',
        });
        // Mongoose assigns _id upon instantiation
        logId = (currentRunLog._id as string | { toString(): string }).toString(); // Typecast to fix type error
        await currentRunLog.save();          // Then save.
        console.log(`Orchestrator: Created initial FetchRunLog with ID: ${logId}`);
    } catch (logError: any) {
        const errMsg = `Orchestrator: CRITICAL - Failed to create initial FetchRunLog: ${logError.message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
        return {
            startTime,
            endTime: new Date(),
            status: 'failed', // Orchestration failed at logging stage
            totalSourcesAttempted: 0,
            totalSourcesSuccessfullyProcessed: 0,
            totalSourcesFailedWithError: 0,
            totalNewArticlesAddedAcrossAllSources: 0,
            detailedSummaries: [],
            orchestrationErrors,
            logId: undefined,
        };
    }

    try {
        const sourcesToProcess = await Source.find({ isEnabled: true }).lean();

        if (!sourcesToProcess || sourcesToProcess.length === 0) {
            console.log('Orchestrator: No enabled sources found to process.');
            orchestrationErrors.push('No enabled sources found to process.');
            runStatus = 'completed'; // Completed, but nothing to do.
        } else {
            console.log(`Orchestrator: Found ${sourcesToProcess.length} enabled sources to process.`);
            for (const sourceDoc of sourcesToProcess) {
                // console.log(`Orchestrator: Processing source - ${sourceDoc.name} (${sourceDoc.url})`);
                const sourceInput: SourceToFetch = {
                    url: sourceDoc.url,
                    type: sourceDoc.type,
                    name: sourceDoc.name,
                };

                const summary = await fetchParseAndStoreSource(sourceInput);
                detailedSummaries.push(summary);

                if (summary.status === 'failed' && summary.fetchError) {
                    totalSourcesFailedWithError++;
                } else {
                    totalSourcesSuccessfullyProcessed++;
                    totalNewArticlesAddedAcrossAllSources += summary.newItemsAdded;
                }

                try {
                    await Source.findByIdAndUpdate(sourceDoc._id, {
                        lastFetchedAt: new Date(),
                        lastStatus: summary.status,
                        lastFetchMessage: summary.message,
                        lastError: summary.fetchError || (summary.errors.length > 0 ? `${summary.errors.length} item-level error(s)` : undefined),
                    });
                } catch (updateError: any) {
                    const errMsg = `Orchestrator: Failed to update source '${sourceDoc.name}' in DB: ${updateError.message}`;
                    console.error(errMsg);
                    orchestrationErrors.push(errMsg);
                }
            }
            // Determine overall run status after processing sources
            if (orchestrationErrors.length > 0 || totalSourcesFailedWithError > 0) {
                runStatus = 'completed_with_errors';
            } else {
                runStatus = 'completed';
            }
        }
    } catch (error: any) {
        const errMsg = `Orchestrator: Error during sources processing loop: ${error.message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
        runStatus = 'failed';
// ... (inside processAllEnabledSources)
  } finally {
    const endTime = new Date();
    if (currentRunLog) {
      currentRunLog.endTime = endTime;
      currentRunLog.status = runStatus; 
      currentRunLog.totalSourcesAttempted = detailedSummaries.length;
      currentRunLog.totalSourcesSuccessfullyProcessed = totalSourcesSuccessfullyProcessed;
      currentRunLog.totalSourcesFailedWithError = totalSourcesFailedWithError;
      currentRunLog.totalNewArticlesAddedAcrossAllSources = totalNewArticlesAddedAcrossAllSources;
      currentRunLog.orchestrationErrors = orchestrationErrors;
      
      // Corrected assignment:
      currentRunLog.sourceSummaries = detailedSummaries; 

      try {
        await currentRunLog.save(); // Mongoose will handle subdocument creation here
        console.log(`Orchestrator: Finalized FetchRunLog ID: ${logId || (currentRunLog._id as any).toString()} with status: ${currentRunLog.status}`);
      } catch (logSaveError: any) {
        const finalLogErrMsg = `Orchestrator: CRITICAL - Failed to save final FetchRunLog (ID: ${logId || currentRunLog?._id?.toString() || 'unknown'}): ${logSaveError.message}`;
        console.error(finalLogErrMsg);
        orchestrationErrors.push(finalLogErrMsg);
        runStatus = 'failed'; 
      }
    }
  }
// ... rest of the function ...

    const result: OverallFetchRunResult = {
        startTime,
        endTime: currentRunLog?.endTime || new Date(),
        status: runStatus, // Use the finally determined runStatus
        totalSourcesAttempted: detailedSummaries.length,
        totalSourcesSuccessfullyProcessed,
        totalSourcesFailedWithError,
        totalNewArticlesAddedAcrossAllSources,
        detailedSummaries,
        orchestrationErrors,
        logId,
    };

    console.log(`Orchestrator: Fetch run finished. Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s. Status: ${result.status}.`);
    return result;
}
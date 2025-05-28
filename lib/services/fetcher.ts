// File: /lib/services/fetcher.ts

import axios from 'axios';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId

// MongoDB and Models
import dbConnect from '../mongodb';
import Article, { IArticle } from '../../models/Article';
import Source /* remove { ISource } if ISource interface itself is not used in this file */ from '../../models/Source';
import FetchRunLog, { IFetchRunLog } from '../../models/FetchRunLog';

// --- Interface Definitions ---

export interface SourceToFetch {
    url: string;
    type: 'rss' | 'html';
    name: string;
}

export interface ItemError {
    itemTitle?: string;
    itemLink?: string;
    message: string;
}

export interface ProcessingSummary {
    sourceUrl: string;
    sourceName: string;
    type: 'rss' | 'html';
    status: 'success' | 'partial_success' | 'failed';
    message: string;
    itemsFound: number;
    itemsProcessed: number;
    newItemsAdded: number;
    itemsSkipped: number;
    errors: ItemError[];
    fetchError?: string;
}

export interface OverallFetchRunResult {
    startTime: Date;
    endTime: Date;
    status: 'completed' | 'completed_with_errors' | 'failed' | 'in-progress';
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
export async function fetchParseAndStoreSource(
    source: SourceToFetch
): Promise<ProcessingSummary> {
    const summary: ProcessingSummary = {
        sourceUrl: source.url,
        sourceName: source.name,
        type: source.type,
        status: 'failed',
        message: '',
        itemsFound: 0,
        itemsProcessed: 0,
        newItemsAdded: 0,
        itemsSkipped: 0,
        errors: [],
    };

    try {
        await dbConnect();
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

            if (parsedFeed.items && parsedFeed.items.length > 0) {
                for (const item of parsedFeed.items) {
                    summary.itemsProcessed++;
                    const normalizedLink = item.link?.trim();
                    const itemTitle = item.title?.trim();

                    if (!normalizedLink) {
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
                    } catch (dbError: unknown) { // Changed to unknown
                        let message = 'Unknown database error';
                        if (dbError instanceof Error) {
                            message = dbError.message;
                        }
                        summary.errors.push({ itemTitle, itemLink: normalizedLink, message });
                    }
                }
            }
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
            summary.itemsFound = 1;
            summary.itemsProcessed = 1;
            summary.message = `HTML page "${pageTitle}" fetched. Full article extraction & saving not yet implemented for individual articles.`;
            summary.status = 'success';
        }
    } catch (error: unknown) { // Changed to unknown
        let message = 'Failed to fetch or process source.';
        if (error instanceof Error) {
            message = `Failed to fetch or process source: ${error.message}`;
            if (axios.isAxiosError(error) && error.response) {
                 message += ` Status: ${error.response.status}.`;
            }
        }
        summary.fetchError = (error instanceof Error) ? error.message : String(error);
        summary.message = message;
        summary.status = 'failed';
    }
    return summary;
}

// --- Orchestrator Function ---
export async function processAllEnabledSources(): Promise<OverallFetchRunResult> {
    const startTime = new Date();
    const detailedSummaries: ProcessingSummary[] = [];
    let totalNewArticlesAddedAcrossAllSources = 0;
    let totalSourcesSuccessfullyProcessed = 0;
    let totalSourcesFailedWithError = 0;
    const orchestrationErrors: string[] = [];
    let runStatus: OverallFetchRunResult['status'] = 'failed';
    let logId: string | undefined = undefined;
    let currentRunLog: IFetchRunLog | null = null;

    console.log('Orchestrator: Starting fetch run...');

    try {
        await dbConnect();
        currentRunLog = new FetchRunLog({
            startTime,
            status: 'in-progress',
        });
        // _id is an ObjectId, ensure it's treated as such or cast for toString()
        logId = (currentRunLog._id as mongoose.Types.ObjectId).toString();
        await currentRunLog.save();
        console.log(`Orchestrator: Created initial FetchRunLog with ID: ${logId}`);
    } catch (logError: unknown) { // Changed to unknown
        let message = 'Unknown error creating initial FetchRunLog.';
        if (logError instanceof Error) {
            message = logError.message;
        }
        const errMsg = `Orchestrator: CRITICAL - Failed to create initial FetchRunLog: ${message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
        return { /* return immediate failure summary as before */ 
            startTime,
            endTime: new Date(),
            status: 'failed',
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
            runStatus = 'completed';
        } else {
            console.log(`Orchestrator: Found ${sourcesToProcess.length} enabled sources to process.`);
            for (const sourceDoc of sourcesToProcess) {
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
                    // sourceDoc._id is from a .lean() query, so it's likely already a compatible type (ObjectId or string)
                    // Mongoose methods like findByIdAndUpdate can often handle string representation of ObjectId
                    await Source.findByIdAndUpdate(sourceDoc._id, {
                        lastFetchedAt: new Date(),
                        lastStatus: summary.status,
                        lastFetchMessage: summary.message,
                        lastError: summary.fetchError || (summary.errors.length > 0 ? `${summary.errors.length} item-level error(s)` : undefined),
                    });
                } catch (updateError: unknown) { // Changed to unknown
                    let message = 'Unknown error updating source document.';
                    if (updateError instanceof Error) {
                        message = updateError.message;
                    }
                    const errMsg = `Orchestrator: Failed to update source '${sourceDoc.name}' in DB: ${message}`;
                    console.error(errMsg);
                    orchestrationErrors.push(errMsg);
                }
            }
            if (orchestrationErrors.length > 0 || totalSourcesFailedWithError > 0) {
                runStatus = 'completed_with_errors';
            } else {
                runStatus = 'completed';
            }
        }
    } catch (error: unknown) { // Changed to unknown
        let message = 'Unknown error during sources processing loop.';
        if (error instanceof Error) {
            message = error.message;
        }
        const errMsg = `Orchestrator: Error during sources processing loop: ${message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
        runStatus = 'failed';
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
            currentRunLog.sourceSummaries = detailedSummaries; // Direct assignment

            try {
                await currentRunLog.save();
                // Use logId (which should be string) or cast _id to string safely
                const finalLogId = logId || (currentRunLog._id as mongoose.Types.ObjectId)?.toString() || 'unknown_after_save_attempt';
                console.log(`Orchestrator: Finalized FetchRunLog ID: ${finalLogId} with status: ${currentRunLog.status}`);
            } catch (logSaveError: unknown) { // Changed to unknown
                let message = 'Unknown error saving final FetchRunLog.';
                if (logSaveError instanceof Error) {
                    message = logSaveError.message;
                }
                const finalLogErrMsg = `Orchestrator: CRITICAL - Failed to save final FetchRunLog (ID: ${logId || currentRunLog?._id?.toString() || 'unknown'}): ${message}`;
                console.error(finalLogErrMsg);
                orchestrationErrors.push(finalLogErrMsg);
                runStatus = 'failed';
            }
        }
    }

    const result: OverallFetchRunResult = {
        startTime,
        endTime: currentRunLog?.endTime || new Date(),
        status: runStatus,
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
// File: /lib/services/fetcher.ts

import Parser from 'rss-parser';
import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId

// MongoDB and Models
import dbConnect from '../mongodb';
import Article, { IArticle } from '../../models/Article';
import Source from '../../models/Source'; // ISource import can be removed if not directly used
import FetchRunLog, { IFetchRunLog } from '../../models/FetchRunLog';

// HTML Scraping
import { HTMLScraper, ScrapingConfig } from '../scrapers/htmlScraper';
import { getWebsiteConfig } from '../scrapers/websiteConfigs';

// --- Interface Definitions ---

export interface SourceToFetch {
    url: string;
    type: 'rss' | 'html';
    name: string;
    scrapingConfig?: {
        websiteId: string;
        maxArticles?: number;
        customSelectors?: {
            articleSelector?: string;
            titleSelector?: string;
            urlSelector?: string;
            dateSelector?: string;
            descriptionSelector?: string;
        };
    };
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
    itemsFound: number;       // Total items found in the source before limiting
    itemsConsidered: number;  // <<-- NEW FIELD: Number of items considered after applying the limit
    itemsProcessed: number;   // Items we actually attempted to save
    newItemsAdded: number;
    itemsSkipped: number;
    errors: ItemError[];
    fetchError?: string;
    logId?: string;  // Optional log ID for individual source fetches
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

// --- Enhanced fetch function with better User-Agent ---
const fetchWithUserAgent = async (url: string): Promise<Response> => {
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    // Add timeout to prevent hanging
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });
};

// --- Core Function for Processing a Single Source ---
export async function fetchParseAndStoreSource(
    source: SourceToFetch
): Promise<ProcessingSummary> {
    // Read the limit from environment variable, with a default (e.g., null if not set or invalid)
    const maxArticlesLimitString = '10';
    const maxArticlesLimit = maxArticlesLimitString ? parseInt(maxArticlesLimitString, 10) : null;
    // Ensure maxArticlesLimit is a positive number, otherwise null (no limit)
    const effectiveMaxArticles = (maxArticlesLimit && maxArticlesLimit > 0) ? maxArticlesLimit : null;

    const summary: ProcessingSummary = {
        sourceUrl: source.url,
        sourceName: source.name,
        type: source.type,
        status: 'failed',
        message: '',
        itemsFound: 0,
        itemsConsidered: 0, // Initialize new field
        itemsProcessed: 0,
        newItemsAdded: 0,
        itemsSkipped: 0,
        errors: [],
    };

    try {
        await dbConnect();
        const response = await fetchWithUserAgent(source.url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const rawContent = await response.text();

        if (source.type === 'rss') {
            const parsedFeed = await rssParser.parseString(rawContent);
            summary.itemsFound = parsedFeed.items?.length || 0; // Total items available in the feed
            
            let itemsToProcess = parsedFeed.items || [];
            let limitMessagePart = '';

            if (effectiveMaxArticles && itemsToProcess.length > effectiveMaxArticles) {
                console.log(`Fetcher: Source ${source.name} has ${itemsToProcess.length} items, limiting to first ${effectiveMaxArticles}.`);
                itemsToProcess = itemsToProcess.slice(0, effectiveMaxArticles);
                limitMessagePart = ` (limited to first ${itemsToProcess.length} of ${summary.itemsFound} found).`;
            }
            summary.itemsConsidered = itemsToProcess.length; // Number of items we will iterate over

            if (itemsToProcess.length > 0) {
                for (const item of itemsToProcess) {
                    summary.itemsProcessed++; // Increment for each item we attempt to process
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
                    } catch (dbError: unknown) {
                        let message = 'Unknown database error';
                        if (dbError instanceof Error) {
                            message = dbError.message;
                        }
                        summary.errors.push({ itemTitle, itemLink: normalizedLink, message });
                    }
                }
            }
            // Set status and message for RSS
            const processedStatsMessage = `Processed ${summary.itemsProcessed} items${limitMessagePart}. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
            if (summary.errors.length > 0) {
                summary.status = 'partial_success';
                summary.message = `Completed with ${summary.errors.length} errors. ${processedStatsMessage}`;
            } else if (summary.itemsConsidered === 0 && summary.itemsFound === 0) {
                summary.status = 'success';
                summary.message = "No items found in RSS feed.";
            } else if (summary.itemsConsidered === 0 && summary.itemsFound > 0) {
                 summary.status = 'success';
                 summary.message = `Found ${summary.itemsFound} items, but 0 considered after limit (or limit was 0). No items processed.`;
            }
             else {
                summary.status = 'success';
                summary.message = `Successfully ${processedStatsMessage}`;
            }

        } else if (source.type === 'html') {
            // HTML scraping implementation
            if (!source.scrapingConfig?.websiteId) {
                throw new Error('HTML source requires scrapingConfig with websiteId');
            }

            const websiteConfig = getWebsiteConfig(source.scrapingConfig.websiteId);
            if (!websiteConfig) {
                throw new Error(`No configuration found for websiteId: ${source.scrapingConfig.websiteId}`);
            }

            // Merge custom selectors with website config
            const mergedConfig: ScrapingConfig = {
                ...websiteConfig,
                maxArticles: source.scrapingConfig.maxArticles || websiteConfig.maxArticles || 20,
                ...(source.scrapingConfig.customSelectors && {
                    articleSelector: source.scrapingConfig.customSelectors.articleSelector || websiteConfig.articleSelector,
                    titleSelector: source.scrapingConfig.customSelectors.titleSelector || websiteConfig.titleSelector,
                    urlSelector: source.scrapingConfig.customSelectors.urlSelector || websiteConfig.urlSelector,
                    dateSelector: source.scrapingConfig.customSelectors.dateSelector || websiteConfig.dateSelector,
                    descriptionSelector: source.scrapingConfig.customSelectors.descriptionSelector || websiteConfig.descriptionSelector,
                })
            };

            const scraper = new HTMLScraper(mergedConfig);
            const scrapedArticles = await scraper.scrapeWebsite(source.url, mergedConfig, source.name);
            
            summary.itemsFound = scrapedArticles.length;
            summary.itemsConsidered = scrapedArticles.length;

            if (scrapedArticles.length > 0) {
                for (const scrapedArticle of scrapedArticles) {
                    summary.itemsProcessed++;
                    
                    try {
                        // Check for existing article by URL
                        const existingArticle = await Article.findOne({ link: scrapedArticle.url });

                        if (existingArticle) {
                            summary.itemsSkipped++;
                        } else {
                            const newArticleDoc = new Article({
                                title: scrapedArticle.title,
                                link: scrapedArticle.url,
                                sourceName: source.name,
                                publishedDate: scrapedArticle.publishedDate ? new Date(scrapedArticle.publishedDate) : new Date(),
                                descriptionSnippet: scrapedArticle.description || '',
                                fetchedAt: new Date(),
                                isRead: false,
                                isStarred: false,
                                categories: [],
                            });
                            await newArticleDoc.save();
                            summary.newItemsAdded++;
                        }
                    } catch (dbError: unknown) {
                        let message = 'Unknown database error';
                        if (dbError instanceof Error) {
                            message = dbError.message;
                        }
                        summary.errors.push({ 
                            itemTitle: scrapedArticle.title, 
                            itemLink: scrapedArticle.url, 
                            message 
                        });
                    }
                }
            }

            // Set status and message for HTML
            const processedStatsMessage = `Processed ${summary.itemsProcessed} articles. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
            if (summary.errors.length > 0) {
                summary.status = 'partial_success';
                summary.message = `Completed with ${summary.errors.length} errors. ${processedStatsMessage}`;
            } else if (summary.itemsConsidered === 0) {
                summary.status = 'success';
                summary.message = "No articles found on website.";
            } else {
                summary.status = 'success';
                summary.message = `Successfully ${processedStatsMessage}`;
            }
        }
    } catch (error: unknown) {
        let message = 'Failed to fetch or process source.';
        if (error instanceof Error) {
            message = `Failed to fetch or process source: ${error.message}`;
        }
        summary.fetchError = (error instanceof Error) ? error.message : String(error);
        summary.message = message;
        summary.status = 'failed';
    }
    return summary;
}

// --- Orchestrator Function ---
// (processAllEnabledSources function remains the same as your last provided version)
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
        logId = (currentRunLog._id as mongoose.Types.ObjectId).toString();
        await currentRunLog.save();
        console.log(`Orchestrator: Created initial FetchRunLog with ID: ${logId}`);
    } catch (logError: unknown) {
        let message = 'Unknown error creating initial FetchRunLog.';
        if (logError instanceof Error) {
            message = logError.message;
        }
        const errMsg = `Orchestrator: CRITICAL - Failed to create initial FetchRunLog: ${message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
        return { 
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
                    scrapingConfig: sourceDoc.scrapingConfig,
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
                } catch (updateError: unknown) {
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
    } catch (error: unknown) {
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
            currentRunLog.sourceSummaries = detailedSummaries; 

            try {
                await currentRunLog.save();
                const finalLogId = logId || (currentRunLog._id as mongoose.Types.ObjectId)?.toString() || 'unknown_after_save_attempt';
                console.log(`Orchestrator: Finalized FetchRunLog ID: ${finalLogId} with status: ${currentRunLog.status}`);
            } catch (logSaveError: unknown) {
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
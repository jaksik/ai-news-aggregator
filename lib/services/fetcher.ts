// File: /lib/services/fetcher.ts
// Key Functionality:
// 1. Source Processing
// Fetches content from RSS feeds and HTML websites
// Uses dedicated processors (RSSProcessor and HTMLProcessor) to parse different content types
// Extracts articles, titles, URLs, and metadata

// 2. Orchestration
// processAllEnabledSources() - Main function that processes all enabled news sources
// fetchParseAndStoreSource() - Handles individual source processing
// Manages the entire fetch run lifecycle from start to finish

// 3. Logging & Tracking
// Creates detailed logs of each fetch run in MongoDB
// Tracks success/failure rates, new articles added, and errors
// Updates source records with last fetch status and timestamps

// 4. Error Handling
// Comprehensive error tracking at both source and orchestration levels

import mongoose from 'mongoose'; // Import mongoose for Types.ObjectId

// MongoDB and Models
import dbConnect from '../mongodb';
import Source from '../../models/Source'; 
import FetchRunLog, { IFetchRunLog } from '../../models/FetchRunLog';

// Import dedicated processors for RSS and HTML content
import { RSSProcessor } from './rssProcessor';
import { HTMLProcessor } from './htmlProcessor';

// --- Interface Definitions ---

export interface SourceToFetch {
    url: string;
    type: 'rss' | 'html';
    name: string;
    scrapingConfig?: {
        websiteId: string;
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
            // RSS processing using dedicated RSSProcessor
            const rssResult = await RSSProcessor.processRSSSource(source, rawContent);
            
            // Copy results from RSS processor to main summary
            Object.assign(summary, rssResult);

        } else if (source.type === 'html') {
            // HTML processing using dedicated HTMLProcessor
            const htmlResult = await HTMLProcessor.processHTMLSource(source, rawContent);
            
            // Copy results from HTML processor to main summary
            Object.assign(summary, htmlResult);
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

// --- Enhanced Single Source Processing with Logging ---
export async function processSingleSource(sourceId: string): Promise<ProcessingSummary & { 
    sourceId: string; 
    sourceName: string; 
    success: boolean; 
    duration: number; 
    logId?: string 
}> {
    const startTime = Date.now();
    const startTimeDate = new Date();
    let logId: string | undefined = undefined;
    let currentRunLog: IFetchRunLog | null = null;

    try {
        await dbConnect();
        
        // Get the source
        const source = await Source.findById(sourceId).lean();

        if (!source) {
            throw new Error('Source not found');
        }

        if (!source.isEnabled) {
            throw new Error('Source is disabled');
        }

        // Create a FetchRunLog entry for this individual scrape
        try {
            currentRunLog = new FetchRunLog({
                startTime: startTimeDate,
                status: 'in-progress',
                totalSourcesAttempted: 1,
                totalSourcesSuccessfullyProcessed: 0,
                totalSourcesFailedWithError: 0,
                totalNewArticlesAddedAcrossAllSources: 0,
                orchestrationErrors: [],
                sourceSummaries: [],
            });
            logId = (currentRunLog._id as mongoose.Types.ObjectId).toString();
            await currentRunLog.save();
            console.log(`Single Source Processor: Created FetchRunLog for individual scrape with ID: ${logId}`);
        } catch (logError) {
            console.error('Single Source Processor: Failed to create FetchRunLog for individual scrape:', logError);
            // Continue without logging - don't fail the scrape operation
        }

        // Create SourceToFetch object
        const sourceToFetch: SourceToFetch = {
            name: source.name,
            url: source.url,
            type: source.type,
            scrapingConfig: source.scrapingConfig,
        };

        // Use the centralized fetcher function
        const fetchResult = await fetchParseAndStoreSource(sourceToFetch);

        // Update the Source document with the results
        try {
            await Source.findByIdAndUpdate(sourceId, {
                lastFetchedAt: new Date(),
                lastStatus: fetchResult.status,
                lastFetchMessage: fetchResult.message || 
                                 (fetchResult.fetchError ? 'Scrape failed' : 
                                 (fetchResult.errors.length > 0 ? 'Completed with item errors' : 'Completed successfully')),
                lastError: fetchResult.fetchError || 
                          (fetchResult.errors.length > 0 ? `${fetchResult.errors.length} item-level error(s)` : undefined),
            });
        } catch (updateError) {
            console.error('Single Source Processor: Failed to update source document:', updateError);
        }

        // Update the FetchRunLog with the results
        if (currentRunLog) {
            const endTime = new Date();
            const isSuccess = fetchResult.status === 'success' || fetchResult.status === 'partial_success';
            
            currentRunLog.endTime = endTime;
            currentRunLog.status = fetchResult.status === 'failed' ? 'failed' : 
                                  fetchResult.errors.length > 0 ? 'completed_with_errors' : 'completed';
            currentRunLog.totalSourcesSuccessfullyProcessed = isSuccess ? 1 : 0;
            currentRunLog.totalSourcesFailedWithError = isSuccess ? 0 : 1;
            currentRunLog.totalNewArticlesAddedAcrossAllSources = fetchResult.newItemsAdded;
            currentRunLog.sourceSummaries = [fetchResult];
            
            if (fetchResult.fetchError) {
                currentRunLog.orchestrationErrors = [`Individual scrape error: ${fetchResult.fetchError}`];
            }
            
            try {
                await currentRunLog.save();
                console.log(`Single Source Processor: Updated FetchRunLog ${logId} with results`);
            } catch (logSaveError) {
                console.error('Single Source Processor: Failed to update FetchRunLog with results:', logSaveError);
            }
        }

        // Return the comprehensive processing summary
        return {
            ...fetchResult, // Include all ProcessingSummary fields
            sourceId,
            sourceName: source.name,
            success: true,
            duration: Date.now() - startTime,
            logId
        };

    } catch (error) {
        console.error(`Single Source Processor: Error scraping source ${sourceId}:`, error);
        
        // Update the FetchRunLog with error status if it exists
        if (currentRunLog) {
            try {
                currentRunLog.endTime = new Date();
                currentRunLog.status = 'failed';
                currentRunLog.totalSourcesFailedWithError = 1;
                currentRunLog.orchestrationErrors = [`Individual scrape error: ${error instanceof Error ? error.message : 'Unknown error'}`];
                await currentRunLog.save();
            } catch (logSaveError) {
                console.error('Single Source Processor: Failed to update FetchRunLog with error status:', logSaveError);
            }
        }
        
        return {
            sourceId,
            sourceName: 'Unknown',
            success: false,
            duration: Date.now() - startTime,
            logId,
            // Include empty ProcessingSummary-like fields for consistency
            sourceUrl: '',
            type: 'html' as const,
            status: 'failed' as const,
            message: error instanceof Error ? error.message : 'Unknown error',
            itemsFound: 0,
            itemsConsidered: 0,
            itemsProcessed: 0,
            newItemsAdded: 0,
            itemsSkipped: 0,
            errors: [],
            fetchError: error instanceof Error ? error.message : 'Unknown error'
        };
    }
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



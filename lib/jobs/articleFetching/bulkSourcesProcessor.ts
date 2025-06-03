// File: Bulk Sources Processing for Article Fetching
// Key Functionality:
// 1. Process all enabled sources in one operation
// 2. Comprehensive logging and error tracking for bulk operations
// 3. Source document updates for all processed sources
// 4. Detailed reporting for bulk operations (scrape-all functionality)

import mongoose from 'mongoose';

// MongoDB and Models
import dbConnect from '../../db';
import Source from '../../../models/Source'; 
import FetchRunLog, { IFetchRunLog } from '../../../models/FetchRunLog';

// Import shared processing logic
import { fetchParseAndStoreSource } from './fetchUtils';

// Import types
import { 
    SourceToFetch, 
    ProcessingSummary, 
    OverallFetchRunResult 
} from './types';

/**
 * Process all enabled sources in bulk - used by scrape-all operations
 * Creates comprehensive FetchRunLog entries and updates all source documents
 */
export async function processBulkSources(): Promise<OverallFetchRunResult> {
    const startTime = new Date();
    const detailedSummaries: ProcessingSummary[] = [];
    let totalNewArticlesAddedAcrossAllSources = 0;
    let totalSourcesSuccessfullyProcessed = 0;
    let totalSourcesFailedWithError = 0;
    const orchestrationErrors: string[] = [];
    let runStatus: OverallFetchRunResult['status'] = 'failed';
    let logId: string | undefined = undefined;
    let currentRunLog: IFetchRunLog | null = null;

    console.log('Bulk Sources Processor: Starting bulk fetch run...');

    try {
        await dbConnect();
        currentRunLog = new FetchRunLog({
            startTime,
            status: 'in-progress',
        });
        logId = (currentRunLog._id as mongoose.Types.ObjectId).toString();
        await currentRunLog.save();
        console.log(`Bulk Sources Processor: Created initial FetchRunLog with ID: ${logId}`);
    } catch (logError: unknown) {
        let message = 'Unknown error creating initial FetchRunLog.';
        if (logError instanceof Error) {
            message = logError.message;
        }
        const errMsg = `Bulk Sources Processor: CRITICAL - Failed to create initial FetchRunLog: ${message}`;
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
            console.log('Bulk Sources Processor: No enabled sources found to process.');
            orchestrationErrors.push('No enabled sources found to process.');
            runStatus = 'completed';
        } else {
            console.log(`Bulk Sources Processor: Found ${sourcesToProcess.length} enabled sources to process.`);
            for (const sourceDoc of sourcesToProcess) {
                const sourceInput: SourceToFetch = {
                    url: sourceDoc.url,
                    type: sourceDoc.type,
                    name: sourceDoc.name,
                    websiteId: sourceDoc.websiteId,
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
                    const errMsg = `Bulk Sources Processor: Failed to update source '${sourceDoc.name}' in DB: ${message}`;
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
        const errMsg = `Bulk Sources Processor: Error during sources processing loop: ${message}`;
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
                console.log(`Bulk Sources Processor: Finalized FetchRunLog ID: ${finalLogId} with status: ${currentRunLog.status}`);
            } catch (logSaveError: unknown) {
                let message = 'Unknown error saving final FetchRunLog.';
                if (logSaveError instanceof Error) {
                    message = logSaveError.message;
                }
                const finalLogErrMsg = `Bulk Sources Processor: CRITICAL - Failed to save final FetchRunLog (ID: ${logId || currentRunLog?._id?.toString() || 'unknown'}): ${message}`;
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
    
    console.log(`Bulk Sources Processor: Bulk fetch run finished. Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s. Status: ${result.status}.`);
    return result;
}

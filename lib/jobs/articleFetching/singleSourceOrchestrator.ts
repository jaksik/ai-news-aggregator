// File: Single Source Processing for Article Fetching
// Key Functionality:
// 1. Individual source processing for API endpoints
// 2. Detailed logging and error tracking for single operations
// 3. Source document updates with fetch status
// 4. Comprehensive result reporting for API responses

import mongoose from 'mongoose';

// MongoDB and Models
// Update the import path below if your connection file is in a different location
import dbConnect from '../../db';
import Source from '../../../models/Source'; 
import FetchRunLog, { IFetchRunLog } from '../../../models/FetchRunLog';

// Import shared processing logic
import { fetchParseAndStoreSource } from './fetchUtils';

// Import types
import { 
    SourceToFetch, 
    ProcessingSummary, 
    SingleSourceResult 
} from './types';

/**
 * Processes a single source with comprehensive logging - used by API endpoints
 * Creates individual FetchRunLog entries and updates source documents
 */
export async function processSingleSource(sourceId: string): Promise<SingleSourceResult> {
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

        // Create a FetchRunLog entry for this individual operation
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
            console.log(`Single Source Processor: Created FetchRunLog for individual operation with ID: ${logId}`);
        } catch (logError) {
            console.error('Single Source Processor: Failed to create FetchRunLog for individual operation:', logError);
            // Continue without logging - don't fail the operation
        }

        // Create SourceToFetch object
        const sourceToFetch: SourceToFetch = {
            name: source.name,
            url: source.url,
            type: source.type,
            websiteId: source.websiteId,
        };

        // Use the shared fetcher function
        const fetchResult = await fetchParseAndStoreSource(sourceToFetch);

        // Update the Source document with the results
        try {
            await Source.findByIdAndUpdate(sourceId, {
                lastFetchedAt: new Date(),
                lastStatus: fetchResult.status,
                lastFetchMessage: fetchResult.message || 
                                 (fetchResult.fetchError ? 'Fetch failed' : 
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
                currentRunLog.orchestrationErrors = [`Individual operation error: ${fetchResult.fetchError}`];
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
        console.error(`Single Source Processor: Error processing source ${sourceId}:`, error);
        
        // Update the FetchRunLog with error status if it exists
        if (currentRunLog) {
            try {
                currentRunLog.endTime = new Date();
                currentRunLog.status = 'failed';
                currentRunLog.totalSourcesFailedWithError = 1;
                currentRunLog.orchestrationErrors = [`Individual operation error: ${error instanceof Error ? error.message : 'Unknown error'}`];
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
            type: 'rss' as const,
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

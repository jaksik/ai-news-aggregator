// File: pages/api/sources/[sourceId]/fetch.ts
// Purpose: Provides a way for the frontend/admin interface to manually trigger fetching 
// for individual news sources (e.g., "Fetch Now" button), separate from 
// the automated bulk fetching process. This is useful for testing, immediate updates, 
// or troubleshooting specific sources.

// Flow: Frontend Request → Validate Source → Create Log 
// → Fetch & Process → Update Database → Return Results

import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Source from '../../../../models/Source';
import FetchRunLog from '../../../../models/FetchRunLog';
import { fetchParseAndStoreSource, ProcessingSummary, SourceToFetch } from '../../../../lib/services/fetcher';

type ResponseData = ProcessingSummary | { error: string; message?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  const { sourceId } = req.query;

  if (!sourceId || Array.isArray(sourceId) || !mongoose.Types.ObjectId.isValid(sourceId as string)) {
    return res.status(400).json({ error: 'Invalid or missing source ID.' });
  }
  const id = sourceId as string;

  if (req.method === 'POST') {
    const startTime = new Date();
    let logId: string | undefined = undefined;
    let currentRunLog: typeof FetchRunLog.prototype | null = null;

    try {
      await dbConnect();
      const sourceDoc = await Source.findById(id);

      if (!sourceDoc) {
        return res.status(404).json({ error: 'Source not found with the provided ID.' });
      }

      console.log(`API: Manually triggering fetch for source: ${sourceDoc.name}`);

      // Create a FetchRunLog entry for this individual fetch
      try {
        currentRunLog = new FetchRunLog({
          startTime,
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
        console.log(`API: Created FetchRunLog for individual fetch with ID: ${logId}`);
      } catch (logError: unknown) {
        console.error('API: Failed to create FetchRunLog for individual fetch:', logError);
        // Continue without logging - don't fail the fetch operation
      }

      const sourceToFetchData: SourceToFetch = {
        name: sourceDoc.name,
        url: sourceDoc.url,
        type: sourceDoc.type,
        scrapingConfig: sourceDoc.scrapingConfig,
      };

      // Call the existing function that processes a single source and saves articles
      const processingResult: ProcessingSummary = await fetchParseAndStoreSource(sourceToFetchData);

      // Update the Source document with the results of this fetch
      sourceDoc.lastFetchedAt = new Date();
      sourceDoc.lastStatus = processingResult.status;
      sourceDoc.lastFetchMessage = processingResult.message || 
                                  (processingResult.fetchError ? 'Fetch failed' : 
                                  (processingResult.errors.length > 0 ? 'Completed with item errors' : 'Completed successfully'));
      sourceDoc.lastError = processingResult.fetchError || 
                            (processingResult.errors.length > 0 ? `${processingResult.errors.length} item-level error(s)` : undefined);
      
      await sourceDoc.save();

      // Update the FetchRunLog with the results
      if (currentRunLog) {
        const endTime = new Date();
        const isSuccess = processingResult.status === 'success' || processingResult.status === 'partial_success';
        
        currentRunLog.endTime = endTime;
        currentRunLog.status = processingResult.status === 'failed' ? 'failed' : 
                               processingResult.errors.length > 0 ? 'completed_with_errors' : 'completed';
        currentRunLog.totalSourcesSuccessfullyProcessed = isSuccess ? 1 : 0;
        currentRunLog.totalSourcesFailedWithError = isSuccess ? 0 : 1;
        currentRunLog.totalNewArticlesAddedAcrossAllSources = processingResult.newItemsAdded;
        currentRunLog.sourceSummaries = [processingResult];
        
        if (processingResult.fetchError) {
          currentRunLog.orchestrationErrors = [`Individual fetch error: ${processingResult.fetchError}`];
        }
        
        try {
          await currentRunLog.save();
          console.log(`API: Updated FetchRunLog ${logId} with results`);
        } catch (logSaveError: unknown) {
          console.error('API: Failed to update FetchRunLog with results:', logSaveError);
        }
      }

      console.log(`API: Finished manual fetch for ${sourceDoc.name}. Status: ${processingResult.status}, New Articles: ${processingResult.newItemsAdded}`);
      
      // Add logId to the response so the frontend can reference it
      const responseWithLogId = {
        ...processingResult,
        logId: logId || undefined
      };
      
      return res.status(200).json(responseWithLogId);

    } catch (error: unknown) {
      console.error(`API /api/sources/${id}/fetch POST Error:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return res.status(500).json({ error: 'Failed to trigger fetch for source', message: errorMessage });
    }

  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

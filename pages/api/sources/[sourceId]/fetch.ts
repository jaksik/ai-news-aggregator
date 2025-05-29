// File: pages/api/sources/[sourceId]/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import Source from '../../../../models/Source';
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
    try {
      await dbConnect();
      const sourceDoc = await Source.findById(id);

      if (!sourceDoc) {
        return res.status(404).json({ error: 'Source not found with the provided ID.' });
      }

      console.log(`API: Manually triggering fetch for source: ${sourceDoc.name}`);

      const sourceToFetchData: SourceToFetch = {
        name: sourceDoc.name,
        url: sourceDoc.url,
        type: sourceDoc.type,
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

      console.log(`API: Finished manual fetch for ${sourceDoc.name}. Status: ${processingResult.status}, New Articles: ${processingResult.newItemsAdded}`);
      return res.status(200).json(processingResult);

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

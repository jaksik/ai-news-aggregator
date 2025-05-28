// File: /lib/services/fetcher.ts

import axios from 'axios';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import dbConnect from '../mongodb'; // Your Mongoose connection utility
import Article, { IArticle } from '../../models/Article'; // Your Article Mongoose model
import Source, { ISource } from '../../models/Source';   // Import the Source model

// This interface remains for individual source fetching
export interface SourceToFetch {
  url: string;
  type: 'rss' | 'html';
  name: string;
}

// This interface remains for the summary of processing a single source
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
  errors: { itemTitle?: string; itemLink?: string; message: string }[];
  fetchError?: string;
}

// New interface for the result of processing ALL enabled sources
export interface OverallFetchRunResult {
  startTime: Date;
  endTime: Date;
  totalSourcesAttempted: number;
  totalSourcesSuccessfullyProcessed: number; // Sources where status was 'success' or 'partial_success'
  totalSourcesFailedWithError: number; // Sources where status was 'failed' due to fetchError or major issue
  totalNewArticlesAddedAcrossAllSources: number;
  detailedSummaries: ProcessingSummary[]; // Array of results for each source
  orchestrationErrors: string[]; // Errors encountered during the orchestration process itself
}

const rssParser = new Parser();

// fetchParseAndStoreSource function (from previous step) remains here...
// ... (ensure it's the version that saves to DB and returns ProcessingSummary) ...
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
    await dbConnect(); // Ensure DB connection (can be called multiple times, Mongoose handles it)
    // console.log(`Fetcher: Connected to DB for source ${source.name}`); // Optional: for verbose logging

    const response = await axios.get(source.url, {
      headers: { /* ... your headers ... */ },
      timeout: 15000,
    });
    const rawContent = response.data;

    if (source.type === 'rss') {
      const parsedFeed = await rssParser.parseString(rawContent);
      summary.itemsFound = parsedFeed.items?.length || 0;
      summary.message = `Found ${summary.itemsFound} items in RSS feed.`;

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
              const newArticle = new Article({
                title: itemTitle || 'Untitled Article',
                link: normalizedLink,
                sourceName: source.name,
                publishedDate: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
                descriptionSnippet: item.contentSnippet || item.content?.substring(0, 300),
                guid: item.guid,
                fetchedAt: new Date(),
                // ... other fields ...
              });
              await newArticle.save();
              summary.newItemsAdded++;
            }
          } catch (dbError: any) {
            summary.errors.push({ itemTitle, itemLink: normalizedLink, message: dbError.message });
          }
        }
      }
      summary.status = summary.errors.length === 0 ? 'success' : (summary.itemsProcessed > 0 ? 'partial_success' : 'success'); // Adjust logic if needed
      if (summary.status === 'success' && summary.itemsFound > 0) summary.message = `Successfully processed ${summary.itemsProcessed} RSS items. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
      else if (summary.status === 'partial_success') summary.message = `Processed ${summary.itemsProcessed} RSS items with ${summary.errors.length} errors. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
      else if (summary.itemsFound === 0) summary.message = "No items found in RSS feed.";


    } else if (source.type === 'html') {
      const $ = cheerio.load(rawContent);
      const pageTitle = $('title').text();
      summary.itemsFound = 1;
      summary.itemsProcessed = 1;
      summary.message = `HTML page "${pageTitle}" fetched. Article extraction & saving not fully implemented.`;
      summary.status = 'success'; // For fetching the page itself
    }

  } catch (error: any) {
    summary.fetchError = error.message;
    summary.message = `Failed to process source: ${error.message}`;
    summary.status = 'failed';
  }
  return summary;
}


// --- NEW ORCHESTRATOR FUNCTION ---
export async function processAllEnabledSources(): Promise<OverallFetchRunResult> {
  const startTime = new Date();
  const detailedSummaries: ProcessingSummary[] = [];
  let totalNewArticlesAddedAcrossAllSources = 0;
  let totalSourcesSuccessfullyProcessed = 0;
  let totalSourcesFailedWithError = 0; // Sources that had a fetchError
  const orchestrationErrors: string[] = [];

  console.log('Orchestrator: Starting to process all enabled sources...');

  try {
    await dbConnect(); // Ensure DB connection at the start
    const sourcesToProcess = await Source.find({ isEnabled: true }).lean();

    if (!sourcesToProcess || sourcesToProcess.length === 0) {
      console.log('Orchestrator: No enabled sources found.');
      return {
        startTime,
        endTime: new Date(),
        totalSourcesAttempted: 0,
        totalSourcesSuccessfullyProcessed: 0,
        totalSourcesFailedWithError: 0,
        totalNewArticlesAddedAcrossAllSources: 0,
        detailedSummaries,
        orchestrationErrors: ['No enabled sources found to process.'],
      };
    }

    console.log(`Orchestrator: Found ${sourcesToProcess.length} enabled sources to process.`);

    for (const sourceDoc of sourcesToProcess) {
      console.log(`Orchestrator: Processing source - ${sourceDoc.name} (${sourceDoc.url})`);
      const sourceInput: SourceToFetch = {
        url: sourceDoc.url,
        type: sourceDoc.type,
        name: sourceDoc.name,
      };

      const summary = await fetchParseAndStoreSource(sourceInput);
      detailedSummaries.push(summary);

      if (summary.status === 'failed' && summary.fetchError) {
        totalSourcesFailedWithError++;
      } else { // Considered processed if no major fetch error, even if partial success
        totalSourcesSuccessfullyProcessed++;
        totalNewArticlesAddedAcrossAllSources += summary.newItemsAdded;
      }

      // Update the Source document in the DB with the latest fetch info
      try {
        await Source.findByIdAndUpdate(sourceDoc._id, {
          lastFetchedAt: new Date(),
          lastStatus: summary.status,
          lastFetchMessage: summary.message || (summary.fetchError ? 'Fetch failed' : (summary.errors.length > 0 ? 'Completed with item errors' : 'Completed successfully')),
          lastError: summary.fetchError || (summary.errors.length > 0 ? `${summary.errors.length} item-level error(s)` : undefined),
        });
        console.log(`Orchestrator: Updated status for source ${sourceDoc.name}.`);
      } catch (updateError: any) {
        const errMsg = `Orchestrator: Failed to update source '${sourceDoc.name}' in DB after fetching: ${updateError.message}`;
        console.error(errMsg);
        orchestrationErrors.push(errMsg);
      }
    }
  } catch (error: any) {
    const errMsg = `Orchestrator: Major error during sources orchestration: ${error.message}`;
    console.error(errMsg);
    orchestrationErrors.push(errMsg);
  }

  const endTime = new Date();
  console.log(`Orchestrator: Finished processing. Total new articles: ${totalNewArticlesAddedAcrossAllSources}. Duration: ${(endTime.getTime() - startTime.getTime())/1000}s`);

  return {
    startTime,
    endTime,
    totalSourcesAttempted: detailedSummaries.length,
    totalSourcesSuccessfullyProcessed,
    totalSourcesFailedWithError,
    totalNewArticlesAddedAcrossAllSources,
    detailedSummaries,
    orchestrationErrors,
  };
}
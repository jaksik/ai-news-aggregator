import axios from 'axios';
import Parser from 'rss-parser'; // For RSS feeds
import * as cheerio from 'cheerio'; // For HTML scraping
import dbConnect from '../mongodb'; // Import your Mongoose connection utility
import Article, { IArticle } from '../../models/Article'; // Import your Article Mongoose model

export interface SourceToFetch {
  url: string;
  type: 'rss' | 'html';
  name: string; // Add a name for the source (e.g., "Google AI Blog")
}

// Updated interface for the result of this operation
export interface ProcessingSummary {
  sourceUrl: string;
  sourceName: string;
  type: 'rss' | 'html';
  status: 'success' | 'partial_success' | 'failed';
  message: string;
  itemsFound: number;         // Total items found in the source (e.g., in RSS feed)
  itemsProcessed: number;     // Items we actually tried to save
  newItemsAdded: number;      // New items successfully saved to DB
  itemsSkipped: number;       // Items skipped (already existed)
  errors: { itemTitle?: string; itemLink?: string; message: string }[]; // Errors during processing/saving individual items
  fetchError?: string;         // Error during the initial fetch
}

const rssParser = new Parser();

// Renamed function to reflect its new responsibility
export async function fetchParseAndStoreSource(
  source: SourceToFetch
): Promise<ProcessingSummary> {
  const summary: ProcessingSummary = {
    sourceUrl: source.url,
    sourceName: source.name,
    type: source.type,
    status: 'failed', // Default to failed, update on success
    message: '',
    itemsFound: 0,
    itemsProcessed: 0,
    newItemsAdded: 0,
    itemsSkipped: 0,
    errors: [],
  };

  try {
    // 1. Connect to Database
    await dbConnect();
    console.log(`Fetcher: Connected to DB for source ${source.name}`);

    // 2. Fetch content
    console.log(`Fetcher: Fetching ${source.type} from: ${source.url}`);
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': source.type === 'rss' ? 'application/rss+xml, application/xml, text/xml' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
      timeout: 15000, // Increased timeout slightly
    });
    const rawContent = response.data;

    // 3. Process based on type
    if (source.type === 'rss') {
      const parsedFeed = await rssParser.parseString(rawContent);
      summary.itemsFound = parsedFeed.items?.length || 0;
      summary.message = `Found ${summary.itemsFound} items in RSS feed.`;

      if (parsedFeed.items && parsedFeed.items.length > 0) {
        for (const item of parsedFeed.items) {
          summary.itemsProcessed++;
          // Basic link normalization (can be expanded)
          const normalizedLink = item.link?.trim();
          const itemTitle = item.title?.trim();

          if (!normalizedLink) {
            console.warn(`Fetcher: RSS item from ${source.name} missing link. Title: ${itemTitle || 'N/A'}`);
            summary.errors.push({ itemTitle, message: 'Item missing link.' });
            continue;
          }

          try {
            // Check if article already exists (by link or guid)
            // Prioritize GUID if it's a permalink, otherwise link
            let existingArticle: IArticle | null = null;
            if (item.guid) {
              existingArticle = await Article.findOne({ guid: item.guid });
            }
            if (!existingArticle && normalizedLink) { // if guid search failed or no guid, try link
              existingArticle = await Article.findOne({ link: normalizedLink });
            }

            if (existingArticle) {
              // console.log(`Fetcher: Article already exists, skipping: ${itemTitle || normalizedLink}`);
              summary.itemsSkipped++;
            } else {
              // Article is new, save it
              const newArticle = new Article({
                title: itemTitle || 'Untitled Article',
                link: normalizedLink,
                sourceName: source.name,
                publishedDate: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : undefined),
                descriptionSnippet: item.contentSnippet || item.content?.substring(0, 300), // Take snippet or part of content
                guid: item.guid,
                fetchedAt: new Date(),
                isRead: false,
                isStarred: false,
                categories: item.categories,
                // content: item.content // Optionally store full content
              });
              await newArticle.save();
              // console.log(`Fetcher: New article saved: ${newArticle.title}`);
              summary.newItemsAdded++;
            }
          } catch (dbError: any) {
            console.error(`Fetcher: DB error for item "${itemTitle || normalizedLink}":`, dbError.message);
            summary.errors.push({ itemTitle, itemLink: normalizedLink, message: dbError.message });
          }
        }
      }
      summary.status = summary.errors.length === 0 ? 'success' : 'partial_success';
      if (summary.status === 'success' && summary.itemsFound > 0) summary.message = `Successfully processed ${summary.itemsProcessed} RSS items. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;
      else if (summary.status === 'partial_success') summary.message = `Processed ${summary.itemsProcessed} RSS items with ${summary.errors.length} errors. Added: ${summary.newItemsAdded}, Skipped: ${summary.itemsSkipped}.`;


    } else if (source.type === 'html') {
      // Current HTML processing is basic. For real article extraction, this needs enhancement.
      const $ = cheerio.load(rawContent);
      const pageTitle = $('title').text();
      summary.itemsFound = 1; // Considering the page itself as one "item" for now
      summary.itemsProcessed = 1;
      summary.message = `HTML page "${pageTitle}" fetched. Full article extraction & saving not yet implemented for HTML.`;
      // For now, we won't try to save individual articles from HTML.
      // You could save a single entry for the page if desired:
      // const normalizedLink = source.url.trim();
      // const existingPage = await Article.findOne({ link: normalizedLink, sourceName: source.name });
      // if (!existingPage) {
      //   const newPageArticle = new Article({ title: pageTitle, link: normalizedLink, sourceName: source.name, fetchedAt: new Date() });
      //   await newPageArticle.save();
      //   summary.newItemsAdded = 1;
      //   summary.message = `Saved basic info for HTML page: ${pageTitle}`;
      // } else {
      //   summary.itemsSkipped = 1;
      //   summary.message = `Basic info for HTML page already exists: ${pageTitle}`;
      // }
      console.log(`Fetcher: HTML page "${pageTitle}" processed (basic).`);
      summary.status = 'success'; // Mark as success for fetching the page
    }

  } catch (error: any) {
    console.error(`Fetcher: Overall error processing source ${source.name} (${source.url}):`, error.message);
    summary.fetchError = error.message;
    summary.message = `Failed to process source: ${error.message}`;
    summary.status = 'failed';
  }

  console.log(`Fetcher: Summary for ${source.name}: ${summary.newItemsAdded} new, ${summary.itemsSkipped} skipped, ${summary.errors.length} errors.`);
  return summary;
}
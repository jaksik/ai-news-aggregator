// File: pages/api/sources/[sourceId]/scrape.ts
// Purpose: Scrape articles from a specific source

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import { scrapeSource } from '../../../../lib/api/controllers/sourcesController';

export default createMethodHandler({
  POST: scrapeSource
});

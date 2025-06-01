// File: pages/api/articles/index.ts
// Purpose: Serves as the main API for retrieving articles with powerful filtering capabilities. Used by:

// Frontend article lists: Display filtered and sorted articles
// Search functionality: Filter by source, date range, visibility
// Admin interface: Review all articles with various filters
// Analytics: Get article counts and data for reporting
// Query Parameters: source, startDate, endDate, limit, page, sortBy, sortOrder, includeHidden, search

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { listArticles } from '../../../lib/api/controllers/articlesController';

export default createMethodHandler({
  GET: listArticles
});

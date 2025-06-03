// File: pages/api/articles/sources.ts
// Purpose: API endpoint for getting unique source names from articles

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { getSourceNames } from '../../../lib/api/controllers/articlesController';

export default createMethodHandler({
  GET: getSourceNames
});

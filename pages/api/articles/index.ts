// File: pages/api/articles/index.ts
// Purpose: Serves as the main API for retrieving articles with powerful filtering capabilities. Used by:

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { listArticles } from '../../../lib/api/controllers/articlesController';

export default createMethodHandler({
  GET: listArticles
});

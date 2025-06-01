// File: pages/api/articles/[articleId]/index.ts
// Purpose: Individual article management (get, update, delete)

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import { getArticle, updateArticle, deleteArticle } from '../../../../lib/api/controllers/articlesController';

export default createMethodHandler({
  GET: getArticle,
  PUT: updateArticle,
  DELETE: deleteArticle
});

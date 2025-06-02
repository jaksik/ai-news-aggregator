// File: pages/api/sources/index.ts
// Purpose: Core CRUD operations for news sources collection

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { listSources, createSource } from '../../../lib/api/controllers/sourcesController';

export default createMethodHandler({
  GET: listSources,
  POST: createSource
});
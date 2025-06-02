// File: pages/api/sources/[sourceId]/index.ts
// Purpose: Individual source management (get, update, delete)

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import { getSource, updateSource, deleteSource } from '../../../../lib/api/controllers/sourcesController';

export default createMethodHandler({
  GET: getSource,
  PUT: updateSource,
  DELETE: deleteSource
});

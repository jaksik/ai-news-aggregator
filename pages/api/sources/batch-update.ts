// File: pages/api/operations/batch.ts
// Purpose: API endpoint for batch operations on sources

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { batchOperations } from '../../../lib/api/controllers/bulkSourcesController';

export default createMethodHandler({
  POST: batchOperations
});

// File: pages/api/sources/[sourceId]/clear-error.ts
// Purpose: Clear error from a specific source

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import { clearSourceError } from '../../../../lib/api/controllers/sourcesController';

export default createMethodHandler({
  POST: clearSourceError
});

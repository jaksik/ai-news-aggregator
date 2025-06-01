// File: pages/api/logs/index.ts
// Purpose: Fetch run logs with filtering and pagination

import { createMethodHandler } from '../../../lib/api/routeHandlerFactory';
import { listLogs } from '../../../lib/api/controllers/logsController';

export default createMethodHandler({
  GET: listLogs
});

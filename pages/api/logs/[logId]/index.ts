// File: pages/api/logs/[logId]/index.ts
// Purpose: Get individual fetch run log by ID

import { createMethodHandler } from '../../../../lib/api/routeHandlerFactory';
import { getLog } from '../../../../lib/api/controllers/logsController';

export default createMethodHandler({
  GET: getLog
});

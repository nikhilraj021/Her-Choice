import { sendSuccess } from '../utils/apiResponse.js';

// Liveness probe. A readiness check (database connectivity) is added in the database module.
export function getHealth(req, res) {
  return sendSuccess(res, {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

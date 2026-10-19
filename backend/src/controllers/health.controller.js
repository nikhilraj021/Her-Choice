import { healthService } from '../services/health.service.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';

/**
 * Reports whether the API can serve traffic, including database connectivity.
 * Returns 200 when healthy and 503 when a dependency is down, so load balancers
 * and uptime monitors can act on the status code alone.
 */
export async function getHealth(req, res) {
  res.set('Cache-Control', 'no-store');

  const report = await healthService.getStatus();

  if (report.status !== 'ok') {
    throw ApiError.serviceUnavailable('Service temporarily unavailable', report);
  }

  return sendSuccess(res, report);
}

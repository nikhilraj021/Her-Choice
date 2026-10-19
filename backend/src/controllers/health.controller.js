import { getHealthStatus } from '../services/health.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export function getHealth(req, res) {
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, getHealthStatus());
}

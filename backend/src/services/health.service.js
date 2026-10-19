import { pingDatabase } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Methods are called through the object (not destructured) so tests can replace a dependency check.
export const healthService = {
  async checkDatabase() {
    const startedAt = performance.now();
    try {
      await pingDatabase();
      return { status: 'up', latencyMs: Math.round(performance.now() - startedAt) };
    } catch (err) {
      logger.error({ err }, 'Database health check failed');
      // The reason is logged, never returned: driver errors can reveal hosts and usernames
      return { status: 'down' };
    }
  },

  async getStatus() {
    const database = await this.checkDatabase();
    const healthy = database.status === 'up';

    return {
      status: healthy ? 'ok' : 'unavailable',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: { database },
    };
  },
};

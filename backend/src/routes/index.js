import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes.js';

// Mounted at /api/v1. Each feature module registers its router here.
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);

import { Router } from 'express';
import { healthRouter } from './health.routes.js';

// Mounted at /api/v1. Each feature registers its router (src/routes/<feature>.routes.js) here.
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);

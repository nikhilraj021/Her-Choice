import { checkDbConnection } from '../config/db.js';

export async function getHealth(req, res) {
  let database = 'up';
  try {
    await checkDbConnection();
  } catch {
    database = 'down';
  }
  res.status(database === 'up' ? 200 : 503).json({ status: 'ok', database });
}

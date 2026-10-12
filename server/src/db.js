import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({ connectionString: config.databaseUrl });

// Shorthand for one-off queries outside a transaction
export const query = (text, params) => pool.query(text, params);

// Runs fn(client) inside BEGIN/COMMIT on a single connection.
// Rolls back on any error and always releases the client.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Creates (or recreates) all tables from db/schema.sql.
import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const sql = await readFile(new URL('../db/schema.sql', import.meta.url), 'utf8');

try {
  await pool.query(sql);
  console.log('Schema applied.');
} catch (err) {
  console.error('Schema setup failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

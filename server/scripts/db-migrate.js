// Applies every db/migrations/*.sql file in name order.
// Each migration is written to be re-runnable, so this is safe to run any time.
import { readdir, readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

const dir = new URL('../db/migrations/', import.meta.url);

try {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    await pool.query(await readFile(new URL(file, dir), 'utf8'));
    console.log(`Applied ${file}`);
  }
  if (!files.length) console.log('No migrations to apply.');
} catch (err) {
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}

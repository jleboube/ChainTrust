#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const migrationsDir = path.join(__dirname);
  const files = fs.readdirSync(migrationsDir).filter(f => f.match(/^\d+.*\.sql$/)).sort();

  if (files.length === 0) {
    console.log('No migrations found.');
    return;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set. Skipping migrations.');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  // Ensure migrations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  for (const file of files) {
    const name = file;
    const res = await client.query('SELECT 1 FROM migrations WHERE name = $1', [name]);
    if (res.rowCount > 0) {
      console.log(`Skipping applied migration: ${name}`);
      continue;
    }

    console.log(`Applying migration: ${name}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      console.log(`Migration applied: ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed to apply migration ${name}:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('All migrations applied.');
}

main().catch(err => {
  console.error('Migrations failed:', err);
  process.exit(1);
});

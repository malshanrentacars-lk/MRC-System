#!/usr/bin/env node
/**
 * Apply SQL migrations from supabase/final_migration.sql to a Postgres database.
 * Usage: set DATABASE_URL then: node scripts/apply_migrations.js
 */

const { readFileSync } = require('fs');
const { Client } = require('pg');
const path = require('path');

async function main() {
  const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL (Postgres connection string)');
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, '..', 'supabase', 'final_migration.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    console.log('Connected to database. Running migrations...');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration failed:', err.message || err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();

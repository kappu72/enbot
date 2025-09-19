#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Script to archive old migration files
 *
 * This script will:
 * 1. Create an archive directory
 * 2. Move old migration files to archive
 * 3. Keep only the new clean migrations
 *
 * Usage:
 * deno run --allow-read --allow-write archive-old-migrations.ts
 */

interface MigrationFile {
  filename: string;
  path: string;
  version: string;
  name: string;
}

async function archiveOldMigrations(): Promise<void> {
  console.log('📁 Archiving old migration files...');

  const migrationsDir = './supabase/migrations';
  const archiveDir = './supabase/migrations/archived';

  // Create archive directory
  try {
    await Deno.mkdir(archiveDir, { recursive: true });
    console.log('✅ Created archive directory');
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  // List all migration files
  const migrations: MigrationFile[] = [];

  for await (const entry of Deno.readDir(migrationsDir)) {
    if (entry.isFile && entry.name.endsWith('.sql')) {
      const filename = entry.name;
      const path = `${migrationsDir}/${filename}`;

      // Extract version and name from filename
      // Handle both formats: YYYYMMDD_HHMMSS and YYYYMMDD_name
      const match = filename.match(/^(\d{8}_(?:\d{6}|[^_]+))_(.+)\.sql$/) ||
        filename.match(/^(\d{8})_(.+)\.sql$/);
      if (match) {
        migrations.push({
          filename,
          path,
          version: match[1],
          name: match[2],
        });
      }
    }
  }

  // Define which migrations to keep (our new clean migrations)
  const keepMigrations = [
    '20250119_100000_create_user_sessions_table.sql',
    '20250119_100001_create_transactions_table.sql',
  ];

  // Archive old migrations
  let archivedCount = 0;

  for (const migration of migrations) {
    if (!keepMigrations.includes(migration.filename)) {
      const sourcePath = migration.path;
      const targetPath = `${archiveDir}/${migration.filename}`;

      console.log(`📦 Archiving: ${migration.filename}`);

      await Deno.rename(sourcePath, targetPath);
      archivedCount++;
    } else {
      console.log(`✅ Keeping: ${migration.filename}`);
    }
  }

  // Create archive README
  const archiveReadme = `# Archived Migrations

This directory contains migration files that were archived during the clean reset on ${
    new Date().toISOString()
  }.

## Archived Files (${archivedCount} total)

${
    migrations
      .filter((m) => !keepMigrations.includes(m.filename))
      .map((m) => `- ${m.filename} (${m.name})`)
      .join('\n')
  }

## Current Active Migrations

${keepMigrations.map((filename) => `- ${filename}`).join('\n')}

These archived migrations are kept for reference but are no longer active in the database.
The database was recreated using the clean migrations above.
`;

  await Deno.writeTextFile(`${archiveDir}/README.md`, archiveReadme);

  console.log(`\n✅ Migration archiving completed!`);
  console.log(`📊 Summary:`);
  console.log(`  - Archived: ${archivedCount} old migrations`);
  console.log(`  - Active: ${keepMigrations.length} clean migrations`);
  console.log(`  - Archive location: ${archiveDir}`);
}

// Run the archiving
try {
  await archiveOldMigrations();
} catch (error) {
  console.error('❌ Archiving failed:', error);
  Deno.exit(1);
}

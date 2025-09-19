# 🧹 Database Clean Reset Instructions

This guide will help you perform a clean reset of your database migrations and tables, creating a fresh starting point based on your current database state.

## 📋 Overview

**What this process does:**
- ✅ Creates clean migrations based on current table definitions
- ✅ Backs up existing data (optional but recommended)
- ✅ Drops and recreates tables with clean schema
- ✅ Archives old migration files for reference
- ✅ Provides a clean foundation for future migrations

## 🔍 Current State Analysis

**Tables in database:**
- `transactions` (5 rows) - JSONB payload structure with Google Sheets sync tracking
- `user_sessions` (3 rows) - Session management with RLS enabled

**Existing migrations (7 files):**
- `20241217_create_transactions_table.sql`
- `20250118_fix_user_sessions_constraint.sql`
- `20250118_restructure_transactions_table.sql`
- `20250118_update_user_sessions_constraint.sql`
- `20250119_add_complete_description_steps.sql`

**New clean migrations (2 files):**
- `20250119_100000_create_user_sessions_table.sql` ✅ Created
- `20250119_100001_create_transactions_table.sql` ✅ Created

## ⚠️ Important Warnings

1. **Data Loss Risk**: Without backup, all data will be lost
2. **Downtime**: The bot will be unavailable during the process
3. **Irreversible**: Once completed, old migration history is gone
4. **Testing**: Perform on dev/staging first if possible

## 🚀 Step-by-Step Process

### Step 1: Archive Old Migrations (Safe)

```bash
# Archive old migration files to keep them for reference
deno run --allow-read --allow-write archive-old-migrations.ts
```

**What this does:**
- Moves old migrations to `supabase/migrations/archived/`
- Keeps only the 2 new clean migrations
- Creates documentation of what was archived

### Step 2: Clean Database Reset (Dangerous - Backup Recommended)

**Option A: With Data Backup (Recommended)**
```bash
# This will backup data, reset schema, and restore data
deno run --allow-env --allow-net --allow-read clean-reset-database.ts --backup
```

**Option B: Fresh Start (Data Lost)**
```bash
# This will completely reset without preserving data
deno run --allow-env --allow-net --allow-read clean-reset-database.ts
```

### Step 3: Verify Results

**Check tables exist:**
```bash
# List tables to verify they were recreated
deno run --allow-env --allow-net --allow-read -e "
import { createClient } from 'jsr:@supabase/supabase-js@2';
const supabase = createClient('YOUR_URL', 'YOUR_KEY');
const { data } = await supabase.from('transactions').select('count');
console.log('Tables accessible:', !!data);
"
```

**Via MCP Server:**
```typescript
// Use the MCP tools to verify
mcp_supabase_list_tables() 
mcp_supabase_list_migrations()
```

### Step 4: Test Bot Functionality

```bash
# Start local development to test
deno run --allow-env --allow-net --allow-read local-dev.ts
```

Test in Telegram:
- `/quota` command flow
- Data persistence
- Google Sheets sync

## 📊 What the Clean Migrations Include

### `user_sessions` Table:
- **Primary Key**: `(user_id, chat_id)`
- **RLS**: Enabled for security
- **Session Management**: 24-hour expiration
- **Step Tracking**: All current step values
- **Proper Comments**: Full documentation

### `transactions` Table:
- **JSONB Payload**: Flexible transaction data
- **Google Sheets Sync**: `is_synced`, `synced_at` tracking
- **Performance Indexes**: Optimized queries
- **Proper Comments**: Full documentation

## 🔄 Future Workflow

After the clean reset:

1. **Only use migrations** for schema changes
2. **Test migrations** in development first
3. **Use MCP server** to apply migrations:
   ```bash
   mcp_supabase_apply_migration("migration_name", "SQL_CONTENT")
   ```
4. **Version control** all migration files

## 🆘 Recovery Plan

If something goes wrong:

1. **Check backup file**: `backup_YYYYMMDDTHHMMSS.json`
2. **Restore data manually** from backup file
3. **Revert to archived migrations** if needed
4. **Contact support** with error details

## 🎯 Ready to Proceed?

**Recommended order:**
1. ✅ Archive migrations (safe)
2. ⚠️ Clean reset with backup
3. ✅ Verify and test

**Before starting:**
- [ ] Ensure bot is not actively used
- [ ] Have SUPABASE_URL and SUPABASE_ACCESS_TOKEN set
- [ ] Understand the risks
- [ ] Ready for potential downtime

**Start with:**
```bash
deno run --allow-read --allow-write archive-old-migrations.ts
```

Would you like me to walk through any specific step or do you have questions about the process?

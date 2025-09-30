-- Additional constraints and indexes for roles system
-- This migration adds any additional constraints that weren't included in the initial creation

-- Note: Main indexes were already created in the first migration (20250121_100000_add_role_to_contacts.sql)
-- This file is kept for future additional constraints if needed

-- Update timestamps
UPDATE roles SET updated_at = NOW() WHERE updated_at IS NULL;
UPDATE contact_roles SET updated_at = NOW() WHERE updated_at IS NULL;

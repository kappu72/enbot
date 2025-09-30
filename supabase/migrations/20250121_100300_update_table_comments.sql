-- Update table comments to reflect the new roles system
-- This migration updates comments for existing tables to document the roles relationship

-- Update contacts table comment to mention roles
COMMENT ON TABLE contacts IS 'Stores contact names for person selection in transactions, with associated roles';

-- Update existing column comments if needed (they should already be appropriate)
-- The existing comments are still valid:
-- COMMENT ON COLUMN contacts.contact IS 'Contact name';
-- COMMENT ON COLUMN contacts.created_at IS 'When the contact was created';
-- COMMENT ON COLUMN contacts.updated_at IS 'When the contact was last updated';

-- Add comments for the new role-related functionality that might be added to contacts table in the future
-- For now, the relationship is handled through the junction table

-- Update timestamps
UPDATE contacts SET updated_at = NOW() WHERE updated_at IS NULL;

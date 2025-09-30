-- Assign default roles to existing contacts
-- This migration assigns appropriate roles to existing contacts

-- Assign default 'famiglia' role to existing contacts
-- This assigns the famiglia role by default to all existing contacts

INSERT INTO contact_roles (contact_id, role_id, sort_order)
SELECT
    c.id,
    r.id,
    0 -- Default sort order
FROM contacts c
CROSS JOIN roles r
WHERE r.name = 'famiglia'; -- Default role for existing contacts

-- Update timestamps
UPDATE roles SET updated_at = NOW();
UPDATE contact_roles SET updated_at = NOW();

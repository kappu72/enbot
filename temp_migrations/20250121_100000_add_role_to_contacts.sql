-- Create roles table and contact_role junction table
-- This migration creates the roles system for organizing contacts

-- First, create the roles table with 4 specific roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert the 4 specific roles as requested by user
INSERT INTO roles (name, description, sort_order) VALUES
('famiglia', 'Famiglia/Genitore', 1),
('maestro', 'Maestro/Insegnante', 2),
('proprietario', 'Proprietario/Amministratore', 3),
('fornitore', 'Fornitore/Collaboratore esterno', 4);

-- Create contact_role junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS contact_roles (
    id BIGSERIAL PRIMARY KEY,
    contact_id BIGINT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact_id, role_id)
);

-- Add comments
COMMENT ON TABLE roles IS 'Defines available roles for contacts';
COMMENT ON TABLE contact_roles IS 'Junction table for many-to-many relationship between contacts and roles with sorting';

COMMENT ON COLUMN roles.name IS 'Role identifier (unique)';
COMMENT ON COLUMN roles.description IS 'Human readable role description';
COMMENT ON COLUMN roles.is_active IS 'Whether this role is currently active';
COMMENT ON COLUMN roles.sort_order IS 'Display order for roles';

COMMENT ON COLUMN contact_roles.contact_id IS 'Reference to contact';
COMMENT ON COLUMN contact_roles.role_id IS 'Reference to role';
COMMENT ON COLUMN contact_roles.sort_order IS 'Sort order for contacts within each role';

-- Create indexes for better performance
CREATE INDEX idx_contact_roles_contact_id ON contact_roles(contact_id);
CREATE INDEX idx_contact_roles_role_id ON contact_roles(role_id);
CREATE INDEX idx_contact_roles_sort_order ON contact_roles(role_id, sort_order);

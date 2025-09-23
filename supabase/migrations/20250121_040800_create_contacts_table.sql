-- Create contacts table
-- This migration creates the contacts table for storing contact names

CREATE TABLE IF NOT EXISTS contacts (
    id BIGSERIAL PRIMARY KEY,
    contact VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE contacts IS 'Stores contact names for person selection in transactions';
COMMENT ON COLUMN contacts.contact IS 'Contact name';
COMMENT ON COLUMN contacts.created_at IS 'When the contact was created';
COMMENT ON COLUMN contacts.updated_at IS 'When the contact was last updated';

-- Fix RLS policies for contact_roles table
-- This migration adds INSERT and UPDATE policies for anon role (bot) to manage contact role assignments

-- Allow anon users to insert contact_roles (for new contact creation)
CREATE POLICY "Allow anon users to insert contact_roles" ON contact_roles
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow anon users to update contact_roles (if needed for future modifications)
CREATE POLICY "Allow anon users to update contact_roles" ON contact_roles
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);


-- Enable RLS for contacts table
-- This migration enables Row Level Security on the contacts table

-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anon users to read all contacts
-- This is needed for the person selection step in the bot
CREATE POLICY "Allow anon users to read all contacts" ON contacts
    FOR SELECT TO anon
    USING (true);

-- Create policy to allow anon users to insert new contacts
-- This allows users to add new contacts through the bot
CREATE POLICY "Allow anon users to insert contacts" ON contacts
    FOR INSERT TO anon
    WITH CHECK (true);

-- Add comment to the table
COMMENT ON TABLE contacts IS 'Stores contact names for person selection in transactions - RLS enabled for anon access';

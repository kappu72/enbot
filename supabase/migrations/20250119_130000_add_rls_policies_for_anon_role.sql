-- Add RLS policies for anon role
-- This migration adds Row Level Security policies for anonymous users

-- Enable RLS on transactions table if not already enabled
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_sessions table if not already enabled  
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for transactions table
CREATE POLICY "Allow anon users to insert transactions" ON transactions
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon users to select their own transactions" ON transactions
    FOR SELECT TO anon
    USING (created_by_user_id = auth.uid()::bigint);

-- Create policies for user_sessions table
CREATE POLICY "Allow anon users to manage their own sessions" ON user_sessions
    FOR ALL TO anon
    USING (user_id = auth.uid()::bigint)
    WITH CHECK (user_id = auth.uid()::bigint);

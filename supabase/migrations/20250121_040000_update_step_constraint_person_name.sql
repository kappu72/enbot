-- Update step constraint to include 'person-name'
-- This migration updates the user_sessions step constraint to include the new 'person-name' step

-- Drop the existing constraint
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_step_check;

-- Add the updated constraint with 'person-name' included
ALTER TABLE user_sessions ADD CONSTRAINT user_sessions_step_check 
    CHECK (step = ANY (ARRAY['person-name'::text, 'amount'::text, 'category'::text, 'period'::text, 'contact'::text]));

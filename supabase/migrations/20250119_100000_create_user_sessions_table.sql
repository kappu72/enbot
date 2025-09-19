-- Clean migration: Create user_sessions table
-- Generated from current database state

CREATE TABLE public.user_sessions (
  id SERIAL,
  user_id BIGINT NOT NULL,
  chat_id BIGINT NOT NULL,
  step TEXT NOT NULL DEFAULT 'idle',
  transaction_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  command_type TEXT NOT NULL DEFAULT 'transaction',
  message_id BIGINT,
  
  -- Primary key constraint
  CONSTRAINT user_sessions_pkey PRIMARY KEY (user_id, chat_id),
  
  -- Check constraint for step values
  CONSTRAINT user_sessions_step_check CHECK (
    step = ANY (ARRAY[
      'idle'::text, 
      'family'::text, 
      'category'::text, 
      'amount'::text, 
      'period'::text, 
      'contact'::text,
      'complete'::text, 
      'description'::text
    ])
  )
);

-- Add comments
COMMENT ON TABLE public.user_sessions IS 'Stores active transaction sessions for users to enable session recovery';
COMMENT ON COLUMN public.user_sessions.user_id IS 'Telegram user ID';
COMMENT ON COLUMN public.user_sessions.chat_id IS 'Telegram chat ID where session was started';
COMMENT ON COLUMN public.user_sessions.step IS 'Current step in transaction flow';
COMMENT ON COLUMN public.user_sessions.transaction_data IS 'Partial transaction data collected so far';
COMMENT ON COLUMN public.user_sessions.expires_at IS 'Session expiration time (24 hours from creation)';
COMMENT ON COLUMN public.user_sessions.command_type IS 'Type of command that started this session (transaction, quote, etc.)';

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (if needed)
-- Note: Add specific RLS policies based on your security requirements
-- CREATE POLICY "Users can only access their own sessions" ON public.user_sessions
--   FOR ALL USING (auth.uid()::text = user_id::text);

-- Clean migration: Create transactions table
-- Generated from current database state

CREATE TABLE public.transactions (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id BIGINT NOT NULL,
  command_type CHARACTER VARYING NOT NULL,
  is_synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP WITH TIME ZONE,
  chat_id BIGINT NOT NULL
);

-- Add comments
COMMENT ON TABLE public.transactions IS 'Tabella transazioni ristrutturata con payload JSON e tracking sincronizzazione';
COMMENT ON COLUMN public.transactions.payload IS 'Payload completo della transazione in formato JSON';
COMMENT ON COLUMN public.transactions.created_by_user_id IS 'ID Telegram dell''utente che ha creato la transazione';
COMMENT ON COLUMN public.transactions.command_type IS 'Tipo di comando che ha generato la transazione (es: transaction, import, etc)';
COMMENT ON COLUMN public.transactions.is_synced IS 'Indica se la transazione è stata sincronizzata con Google Sheets';
COMMENT ON COLUMN public.transactions.synced_at IS 'Timestamp di quando è stata sincronizzata';

-- Create indexes for performance
CREATE INDEX idx_transactions_created_by_user_id ON public.transactions(created_by_user_id);
CREATE INDEX idx_transactions_chat_id ON public.transactions(chat_id);
CREATE INDEX idx_transactions_command_type ON public.transactions(command_type);
CREATE INDEX idx_transactions_is_synced ON public.transactions(is_synced);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);

-- JSONB GIN index for efficient querying of payload
CREATE INDEX idx_transactions_payload_gin ON public.transactions USING GIN(payload);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
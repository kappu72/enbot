-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  family TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  period DATE NOT NULL,
  contact TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chat_id BIGINT NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_recorded_at ON transactions(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_family ON transactions(family);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Stores cash transaction records from the Telegram bot';
COMMENT ON COLUMN transactions.family IS 'Family name from predefined list';
COMMENT ON COLUMN transactions.category IS 'Transaction category (quota mensile, quota iscrizione, altro)';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in EUR';
COMMENT ON COLUMN transactions.period IS 'Transaction period/date';
COMMENT ON COLUMN transactions.contact IS 'Telegram username to notify';
COMMENT ON COLUMN transactions.recorded_by IS 'User who recorded the transaction';
COMMENT ON COLUMN transactions.recorded_at IS 'Timestamp when transaction was recorded';
COMMENT ON COLUMN transactions.chat_id IS 'Telegram chat ID where transaction was recorded';

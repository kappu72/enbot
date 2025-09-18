-- Migrazione per ristrutturare la tabella transactions
-- Drop della tabella esistente e creazione della nuova struttura

-- Backup dei dati esistenti (se necessario)
CREATE TABLE IF NOT EXISTS transactions_backup AS 
SELECT * FROM transactions;

-- Drop della tabella esistente
DROP TABLE IF EXISTS transactions;

-- Creazione della nuova tabella transactions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  
  -- Payload completo del flusso come JSON
  payload JSONB NOT NULL,
  
  -- Metadati
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by_user_id BIGINT NOT NULL,
  command_type VARCHAR(50) NOT NULL,
  
  -- Stato di sincronizzazione
  is_synced BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Chat ID per riferimento
  chat_id BIGINT NOT NULL
);

-- Indici per performance
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_created_by_user_id ON transactions(created_by_user_id);
CREATE INDEX idx_transactions_command_type ON transactions(command_type);
CREATE INDEX idx_transactions_is_synced ON transactions(is_synced);
CREATE INDEX idx_transactions_chat_id ON transactions(chat_id);

-- Indice GIN per ricerche nel payload JSON
CREATE INDEX idx_transactions_payload_gin ON transactions USING GIN (payload);

-- Commenti per documentazione
COMMENT ON TABLE transactions IS 'Tabella transazioni ristrutturata con payload JSON e tracking sincronizzazione';
COMMENT ON COLUMN transactions.payload IS 'Payload completo della transazione in formato JSON';
COMMENT ON COLUMN transactions.created_by_user_id IS 'ID Telegram dell''utente che ha creato la transazione';
COMMENT ON COLUMN transactions.command_type IS 'Tipo di comando che ha generato la transazione (es: transaction, import, etc)';
COMMENT ON COLUMN transactions.is_synced IS 'Indica se la transazione è stata sincronizzata con Google Sheets';
COMMENT ON COLUMN transactions.synced_at IS 'Timestamp di quando è stata sincronizzata';

-- Migrazione dei dati esistenti (se la tabella backup esiste e ha dati)
INSERT INTO transactions (payload, created_by_user_id, command_type, chat_id, created_at, is_synced)
SELECT 
  jsonb_build_object(
    'family', family,
    'category', category,
    'amount', amount,
    'period', period,
    'contact', contact,
    'recordedBy', recorded_by,
    'recordedAt', recorded_at
  ) as payload,
  -- Estrai user ID dal campo recorded_by (rimuovi @ se presente)
  CASE 
    WHEN recorded_by LIKE '@%' THEN CAST(SUBSTRING(recorded_by FROM 2) AS BIGINT)
    ELSE CAST(recorded_by AS BIGINT)
  END as created_by_user_id,
  'transaction' as command_type,
  chat_id,
  recorded_at::timestamp with time zone,
  FALSE as is_synced
FROM transactions_backup
WHERE EXISTS (SELECT 1 FROM transactions_backup);

-- Drop della tabella backup dopo la migrazione
DROP TABLE IF EXISTS transactions_backup;

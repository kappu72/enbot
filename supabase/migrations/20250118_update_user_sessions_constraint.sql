-- Aggiorna la struttura della tabella user_sessions per supportare comandi multipli per chat
-- Permette a un utente di avere sessioni attive per comandi diversi nella stessa chat

-- Step 1: Rimuovi la chiave primaria esistente
ALTER TABLE user_sessions DROP CONSTRAINT user_sessions_pkey;

-- Step 2: Aggiungi una nuova colonna ID come chiave primaria se non esiste
ALTER TABLE user_sessions 
ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;

-- Step 3: Crea un constraint unico sulla combinazione (user_id, chat_id, command_type)
-- Questo permette a un utente di avere sessioni attive per comandi diversi nella stessa chat
ALTER TABLE user_sessions 
ADD CONSTRAINT unique_user_chat_command 
UNIQUE (user_id, chat_id, command_type);

-- Step 4: Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_chat ON user_sessions(user_id, chat_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_command_type ON user_sessions(command_type);

-- Commenti per documentazione
COMMENT ON CONSTRAINT unique_user_chat_command ON user_sessions 
IS 'Ensures one active session per user per chat per command type';

-- Aggiunge i valori 'complete' e 'description' al constraint user_sessions_step_check
-- Questo permette di avere step aggiuntivi nel flusso delle sessioni utente

-- Step 1: Rimuovi il constraint esistente
ALTER TABLE user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_step_check;

-- Step 2: Aggiungi il nuovo constraint con i valori aggiuntivi
ALTER TABLE user_sessions 
ADD CONSTRAINT user_sessions_step_check 
CHECK (step = ANY (ARRAY[
  'idle'::text, 
  'family'::text, 
  'category'::text, 
  'amount'::text, 
  'period'::text, 
  'contact'::text,
  'complete'::text,
  'description'::text
]));

-- Commento per documentazione
COMMENT ON CONSTRAINT user_sessions_step_check ON user_sessions 
IS 'Validates step values: idle, family, category, amount, period, contact, complete, description';

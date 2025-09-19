-- Rimuove il constraint problematico che impedisce sessioni multiple per lo stesso comando in chat diverse
-- Mantiene solo la logica: una sessione per utente per chat (indipendentemente dal comando)

-- Rimuovi il constraint che impedisce lo stesso comando in chat diverse
ALTER TABLE user_sessions 
DROP CONSTRAINT IF EXISTS user_sessions_user_command_unique;

-- Aggiungi commento per chiarire la logica
COMMENT ON TABLE user_sessions IS 'One active session per user per chat (command type can be overridden)';

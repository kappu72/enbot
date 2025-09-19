-- Abilita RLS e aggiunge policy specifiche per l'accesso del bot.
-- Il bot opera usando il ruolo 'anon', che non ha un ID utente.
-- La logica di autorizzazione primaria è gestita nel codice del bot.

-- Step 1: Policy per user_sessions
-- Permette al ruolo 'anon' (il bot) di gestire le sessioni.
CREATE POLICY "Allow bot (anon role) to manage sessions"
ON public.user_sessions
FOR ALL
TO anon -- Specifica che è solo per il ruolo 'anon'
USING (true)
WITH CHECK (true);

-- Step 2: Abilita RLS per transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Step 3: Policy per transactions
-- Permette al ruolo 'anon' (il bot) di gestire le transazioni.
CREATE POLICY "Allow bot (anon role) to manage transactions"
ON public.transactions
FOR ALL
TO anon -- Specifica che è solo per il ruolo 'anon'
USING (true)
WITH CHECK (true);
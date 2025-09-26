-- Restore original income categories
-- This migration restores the original income categories that were overwritten

-- First, create new categories for the original income types
INSERT INTO categories (name, label, description, is_active, sort_order) VALUES
('Quota Mensile', 'Quota', 'Quota mensile per la scuola', true, 1),
('Quota Esame', 'Esame', 'Quota per esami', true, 2),
('Quota Iscrizione', 'Iscrizione', 'Quota di iscrizione', true, 3),
('Eventi', 'Eventi', 'Spese per eventi', true, 4),
('Deposito Cauzionale', 'D. cauzione', 'Deposito cauzionale', true, 5),
('Altro', 'Altro', 'Altre spese/redditi', true, 6);

-- Get the IDs of the newly created income categories
-- Assign them to income type
INSERT INTO category_type_assignments (category_id, category_type_id)
SELECT c.id, ct.id
FROM categories c
CROSS JOIN category_types ct
WHERE ct.name = 'income'
AND c.name IN ('Quota Mensile', 'Quota Esame', 'Quota Iscrizione', 'Eventi', 'Deposito Cauzionale', 'Altro')
AND c.id > 11; -- Only the newly created ones

-- Update timestamps
UPDATE categories 
SET updated_at = NOW()
WHERE name IN ('Quota Mensile', 'Quota Esame', 'Quota Iscrizione', 'Eventi', 'Deposito Cauzionale', 'Altro')
AND id > 11;

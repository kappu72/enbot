-- Create and assign creditNote categories
-- This migration creates new creditNote categories and assigns existing ones

-- First, remove all current creditNote type assignments to start fresh
DELETE FROM category_type_assignments 
WHERE category_type_id = (SELECT id FROM category_types WHERE name = 'creditNote');

-- Create new categories for creditNote that don't exist yet
INSERT INTO categories (name, label, description, is_active, sort_order) VALUES
('IMU', 'IMU', 'Imposta Municipale Unica', true, 1),
('Utenza Tari', 'Tari', 'Tassa sui rifiuti', true, 2),
('Utenza Acqua', 'Acqua', 'Spese per utenza acqua', true, 3),
('Webcolf', 'Webcolf', 'Servizio Webcolf', true, 4),
('Utenza co', 'Utenza co', 'Utenza condominiale', true, 5);

-- Now assign all creditNote categories (existing + new)
-- Existing categories that should be available for creditNote:
-- Cambusa (id=1), Manutenzione (id=4), Materiale didattico (id=5), 
-- Pronto Soccorso (id=6), Pulizie (id=7), Spese Varie (id=8), 
-- Stipendi contributi (id=9), Eventi (id=15)

INSERT INTO category_type_assignments (category_id, category_type_id)
SELECT c.id, ct.id
FROM categories c
CROSS JOIN category_types ct
WHERE ct.name = 'creditNote'
AND (
    -- Existing categories
    c.id IN (1, 4, 5, 6, 7, 8, 9, 15)
    OR 
    -- New categories (get the IDs of newly created ones)
    c.name IN ('IMU', 'Utenza Tari', 'Utenza Acqua', 'Webcolf', 'Utenza co')
);

-- Update timestamps for new categories
UPDATE categories 
SET updated_at = NOW()
WHERE name IN ('IMU', 'Utenza Tari', 'Utenza Acqua', 'Webcolf', 'Utenza co');

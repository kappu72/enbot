-- Create and update outcome categories
-- This migration creates new outcome categories and updates existing ones

-- First, remove all current outcome type assignments to start fresh
DELETE FROM category_type_assignments 
WHERE category_type_id = (SELECT id FROM category_types WHERE name = 'outcome');

-- Update existing categories with new names and labels for outcome
UPDATE categories SET 
  name = 'Cambusa',
  label = 'Cambusa'
WHERE id = 1;

UPDATE categories SET 
  name = 'Circolo Arci',
  label = 'Circolo'
WHERE id = 2;

UPDATE categories SET 
  name = 'Legna',
  label = 'Legna'
WHERE id = 3;

UPDATE categories SET 
  name = 'Manutenzione',
  label = 'Manutenzione'
WHERE id = 4;

UPDATE categories SET 
  name = 'Materiale didattico',
  label = 'M. didattico'
WHERE id = 5;

UPDATE categories SET 
  name = 'Pronto Soccorso',
  label = 'P. soccorso'
WHERE id = 6;

-- Create new categories for the remaining outcome types
INSERT INTO categories (name, label, description, is_active, sort_order) VALUES
('Pulizie', 'Pulizie', 'Spese per pulizie', true, 7),
('Spese Varie', 'Altro', 'Altre spese varie', true, 8),
('Stipendi contributi', 'Stipendio', 'Stipendi e contributi', true, 9),
('Straordinaria manutenzione', 'M. straordinaria', 'Manutenzione straordinaria', true, 10),
('Utenza Luce', 'Utenza Luce', 'Spese per utenza luce', true, 11);

-- Now assign all categories to outcome type
INSERT INTO category_type_assignments (category_id, category_type_id)
SELECT c.id, ct.id
FROM categories c
CROSS JOIN category_types ct
WHERE ct.name = 'outcome'
AND c.id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

-- Update timestamps
UPDATE categories 
SET updated_at = NOW()
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

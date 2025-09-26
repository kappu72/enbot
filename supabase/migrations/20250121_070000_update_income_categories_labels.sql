-- Update income categories with new labels and add Eventi to income type
-- This migration updates the existing income categories according to the new requirements

-- First, update the existing income category labels
UPDATE categories 
SET label = 'Quota'
WHERE id = 1 AND name = 'Quota Mensile';

UPDATE categories 
SET label = 'Esame'
WHERE id = 2 AND name = 'Quota Esame';

UPDATE categories 
SET label = 'Iscrizione'
WHERE id = 3 AND name = 'Quota Iscrizione';

UPDATE categories 
SET label = 'D. cauzione'
WHERE id = 5 AND name = 'Deposito Cauzionale';

UPDATE categories 
SET label = 'Altro'
WHERE id = 6 AND name = 'Altro';

-- Add Eventi category to income type if it's not already assigned
-- First check if Eventi (id=4) is already assigned to income type
INSERT INTO category_type_assignments (category_id, category_type_id)
SELECT 4, ct.id
FROM category_types ct
WHERE ct.name = 'income'
AND NOT EXISTS (
    SELECT 1 FROM category_type_assignments cta 
    WHERE cta.category_id = 4 
    AND cta.category_type_id = ct.id
);

-- Update the updated_at timestamp for all modified categories
UPDATE categories 
SET updated_at = NOW()
WHERE id IN (1, 2, 3, 4, 5, 6);

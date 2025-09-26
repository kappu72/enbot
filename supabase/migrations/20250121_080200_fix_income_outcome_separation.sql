-- Fix separation between income and outcome categories
-- Remove income assignments from outcome categories (IDs 1-11)

DELETE FROM category_type_assignments 
WHERE category_id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
AND category_type_id = (SELECT id FROM category_types WHERE name = 'income');

-- Ensure outcome categories are only assigned to outcome type
INSERT INTO category_type_assignments (category_id, category_type_id)
SELECT c.id, ct.id
FROM categories c
CROSS JOIN category_types ct
WHERE ct.name = 'outcome'
AND c.id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
AND NOT EXISTS (
    SELECT 1 FROM category_type_assignments cta 
    WHERE cta.category_id = c.id 
    AND cta.category_type_id = ct.id
);

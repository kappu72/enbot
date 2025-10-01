-- Insert famiglia contacts
-- This migration adds the specified family names to the contacts table and assigns them the famiglia role

-- First, insert the new family contacts
INSERT INTO contacts (contact) VALUES
('Bellesso'),
('Bregant'),
('Bruni'),
('Calamandrei'),
('Cappugi'),
('Cecchini'),
('Cencetti'),
('Curradi'),
('Errico'),
('Falai'),
('Faraoni'),
('Grandi'),
('Innocenti'),
('Laponti'),
('Leone'),
('Liceti'),
('M. Montserrat'),
('Margheri'),
('Masini'),
('Materassi'),
('Mattia'),
('Mazzoli'),
('Mecarozzi'),
('Moldoveanu'),
('Monducci'),
('Nickname'),
('Palagi'),
('Paoletti'),
('Pescatori'),
('Pochesci'),
('Ragonesi'),
('Testa Camillo'),
('Tiseo'),
('Tosetti'),
('Vecciarelli'),
('Vetri'),
('Vivoli')
ON CONFLICT (contact) DO NOTHING; -- Skip if contact already exists

-- Then, assign the famiglia role to these new contacts
INSERT INTO contact_roles (contact_id, role_id, sort_order)
SELECT
    c.id,
    r.id,
    0 -- Default sort order
FROM contacts c
CROSS JOIN roles r
WHERE r.name = 'famiglia'
AND c.contact IN (
    'Bellesso',
    'Bregant',
    'Bruni',
    'Calamandrei',
    'Cappugi',
    'Cecchini',
    'Cencetti',
    'Curradi',
    'Errico',
    'Falai',
    'Faraoni',
    'Grandi',
    'Innocenti',
    'Laponti',
    'Leone',
    'Liceti',
    'M. Montserrat',
    'Margheri',
    'Masini',
    'Materassi',
    'Mattia',
    'Mazzoli',
    'Mecarozzi',
    'Moldoveanu',
    'Monducci',
    'Nickname',
    'Palagi',
    'Paoletti',
    'Pescatori',
    'Pochesci',
    'Ragonesi',
    'Testa Camillo',
    'Tiseo',
    'Tosetti',
    'Vecciarelli',
    'Vetri',
    'Vivoli'
)
-- Only insert if the contact_role relationship doesn't already exist
AND NOT EXISTS (
    SELECT 1 FROM contact_roles cr
    WHERE cr.contact_id = c.id AND cr.role_id = r.id
);

-- Update timestamps
UPDATE contacts SET updated_at = NOW() WHERE contact IN (
    'Bellesso',
    'Bregant',
    'Bruni',
    'Calamandrei',
    'Cappugi',
    'Cecchini',
    'Cencetti',
    'Curradi',
    'Errico',
    'Falai',
    'Faraoni',
    'Grandi',
    'Innocenti',
    'Laponti',
    'Leone',
    'Liceti',
    'M. Montserrat',
    'Margheri',
    'Masini',
    'Materassi',
    'Mattia',
    'Mazzoli',
    'Mecarozzi',
    'Moldoveanu',
    'Monducci',
    'Nickname',
    'Palagi',
    'Paoletti',
    'Pescatori',
    'Pochesci',
    'Ragonesi',
    'Testa Camillo',
    'Tiseo',
    'Tosetti',
    'Vecciarelli',
    'Vetri',
    'Vivoli'
);

-- Update timestamps for contact_roles
UPDATE contact_roles SET updated_at = NOW() WHERE contact_id IN (
    SELECT id FROM contacts WHERE contact IN (
        'Bellesso',
        'Bregant',
        'Bruni',
        'Calamandrei',
        'Cappugi',
        'Cecchini',
        'Cencetti',
        'Curradi',
        'Errico',
        'Falai',
        'Faraoni',
        'Grandi',
        'Innocenti',
        'Laponti',
        'Leone',
        'Liceti',
        'M. Montserrat',
        'Margheri',
        'Masini',
        'Materassi',
        'Mattia',
        'Mazzoli',
        'Mecarozzi',
        'Moldoveanu',
        'Monducci',
        'Nickname',
        'Palagi',
        'Paoletti',
        'Pescatori',
        'Pochesci',
        'Ragonesi',
        'Testa Camillo',
        'Tiseo',
        'Tosetti',
        'Vecciarelli',
        'Vetri',
        'Vivoli'
    )
);

-- Enable RLS policies for roles and contact_roles tables to allow anon access
-- This is needed because the edge functions run as anon users and need to read these tables

-- Allow anon users to read roles
CREATE POLICY "Allow anon users to read roles" ON roles
    FOR SELECT USING (true);

-- Allow anon users to read contact_roles
CREATE POLICY "Allow anon users to read contact_roles" ON contact_roles
    FOR SELECT USING (true);

-- Allow anon users to insert contact_roles (for new contact creation)
CREATE POLICY "Allow anon users to insert contact_roles" ON contact_roles
    FOR INSERT TO anon
    WITH CHECK (true);

-- Allow anon users to update contact_roles (if needed for future modifications)
CREATE POLICY "Allow anon users to update contact_roles" ON contact_roles
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

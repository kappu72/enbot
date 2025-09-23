-- Insert initial contacts
-- This migration inserts the predefined list of contacts

INSERT INTO contacts (contact) VALUES
('Ada'),
('Ale'),
('Alma'),
('Anita&Nora'),
('Aran'),
('Arturo'),
('Ben'),
('Cosimo'),
('Dafne'),
('Ema&Fra'),
('Giovanni'),
('Giorgia&Pietro'),
('Giuli'),
('Iris'),
('Lauro&Lunaria'),
('Leo'),
('Libero'),
('Noa'),
('Sole'),
('Sole Gaia'),
('Sole&Olmo'),
('Thiago'),
('Vieri'),
('Zeno'),
('Zoe'),
('Gherardo')
ON CONFLICT (contact) DO NOTHING;

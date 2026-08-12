-- Seed the products table with the catalog used by the storefront.
-- Prices are stored in cents to avoid floating point rounding issues.

INSERT INTO products (id, name, price_cents, light, water, size, tag, image_emoji) VALUES
  ('p1', 'Monstera Deliciosa',   4200, 'Bright, indirect',  'Weekly',   'Medium', 'Popular',   '🌿'),
  ('p2', 'Snake Plant',         2800, 'Low to bright',     'Biweekly', 'Small',  'Beginner',  '🌱'),
  ('p3', 'Fiddle Leaf Fig',     6500, 'Bright, indirect',  'Weekly',   'Large',  'Statement', '🪴'),
  ('p4', 'Pothos Marble Queen', 2200, 'Low to medium',     'Weekly',   'Small',  'Beginner',  '🌿'),
  ('p5', 'Bird of Paradise',    7800, 'Bright, direct',    'Weekly',   'Large',  'Statement', '🪴'),
  ('p6', 'ZZ Plant',            3400, 'Low light',         'Monthly',  'Medium', 'Beginner',  '🌱')
ON CONFLICT (id) DO NOTHING;

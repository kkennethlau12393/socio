/*
  # Add Dev Email Domains

  1. Changes
    - Add development email domains (tomlau.com, socio-app.com) to universities table
    - These will be marked as "Dev" university for testing purposes
    - Allows kenneth@tomlau.com, kenneth@socio-app.com, misha@socio-app.com to sign up

  2. Details
    - Create "Development" university entries with proper UUIDs
    - Add both domains as separate entries
*/

-- Insert tomlau.com domain
INSERT INTO universities (id, name, domain, location)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Development (Tomlau)',
  'tomlau.com',
  'London'
)
ON CONFLICT (domain) DO NOTHING;

-- Add socio-app.com domain
INSERT INTO universities (id, name, domain, location)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Development (Socio)',
  'socio-app.com',
  'London'
)
ON CONFLICT (domain) DO NOTHING;

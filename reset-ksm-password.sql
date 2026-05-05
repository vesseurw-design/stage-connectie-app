-- Reset Wachtwoord voor Admin KSM
-- Instructies:
-- 1. Ga naar Supabase Dashboard -> SQL Editor
-- 2. Plak deze code en klik op RUN
-- 3. Probeer daarna in te loggen met: AdminKSM2026!

UPDATE auth.users
SET encrypted_password = crypt('AdminKSM2026!', gen_salt('bf'))
WHERE email = 'ksm@scopemail.nl';

-- Controleer of de update is gelukt (zou 1 row moeten teruggeven)
SELECT email, updated_at FROM auth.users WHERE email = 'ksm@scopemail.nl';

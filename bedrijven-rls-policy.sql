-- RLS Policy voor Bedrijven tabel
-- Zodat employers hun eigen gegevens kunnen lezen

-- Verwijder oude policies
DROP POLICY IF EXISTS "Allow all to read Bedrijven" ON public."Bedrijven";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Bedrijven";

-- Maak nieuwe policy: iedereen mag lezen (voor nu)
CREATE POLICY "Allow all to read Bedrijven"
ON public."Bedrijven"
FOR SELECT
USING (true);

-- Verificatie
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'Bedrijven';

-- Kopieer en voer deze SQL uit in de Supabase SQL Editor om de rechten te herstellen

-- 1. Rechten voor Students tabel (Hoofdletter S)
ALTER TABLE "Students" ENABLE ROW LEVEL SECURITY;

-- Verwijder oude policies om conflicten te voorkomen
DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Students";
DROP POLICY IF EXISTS "Enable read for anon" ON "Students";
DROP POLICY IF EXISTS "Allow public read access" ON "Students";

-- Maak nieuwe policies
-- Iedereen die is ingelogd (authenticated) mag alles doen (lezen, schrijven, verwijderen)
CREATE POLICY "Enable all for authenticated users" ON "Students" 
FOR ALL USING (auth.role() = 'authenticated');

-- Ook anonieme bezoekers (niet ingelogd) mogen lezen (nodig voor bepaalde checks)
CREATE POLICY "Enable read for anon" ON "Students" 
FOR SELECT USING (true);


-- 2. Rechten voor Bedrijven tabel (Hoofdletter B)
ALTER TABLE "Bedrijven" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Bedrijven";
DROP POLICY IF EXISTS "Enable read for anon" ON "Bedrijven";

CREATE POLICY "Enable all for authenticated users" ON "Bedrijven" 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for anon" ON "Bedrijven" 
FOR SELECT USING (true);


-- 3. Rechten voor stagebegeleiders tabel (kleine letter s)
-- We proberen zowel met als zonder hoofdletter voor de zekerheid
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'stagebegeleiders') THEN
        EXECUTE 'ALTER TABLE "stagebegeleiders" ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Enable all for authenticated users" ON "stagebegeleiders"';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read for anon" ON "stagebegeleiders"';
        EXECUTE 'CREATE POLICY "Enable all for authenticated users" ON "stagebegeleiders" FOR ALL USING (auth.role() = ''authenticated'')';
        EXECUTE 'CREATE POLICY "Enable read for anon" ON "stagebegeleiders" FOR SELECT USING (true)';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'Stagebegeleiders') THEN
        EXECUTE 'ALTER TABLE "Stagebegeleiders" ENABLE ROW LEVEL SECURITY';
        EXECUTE 'DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Stagebegeleiders"';
        EXECUTE 'DROP POLICY IF EXISTS "Enable read for anon" ON "Stagebegeleiders"';
        EXECUTE 'CREATE POLICY "Enable all for authenticated users" ON "Stagebegeleiders" FOR ALL USING (auth.role() = ''authenticated'')';
        EXECUTE 'CREATE POLICY "Enable read for anon" ON "Stagebegeleiders" FOR SELECT USING (true)';
    END IF;
END $$;


-- 4. Rechten voor Attendance tabel
ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON "Attendance";
DROP POLICY IF EXISTS "Enable read for anon" ON "Attendance";

CREATE POLICY "Enable all for authenticated users" ON "Attendance" 
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read for anon" ON "Attendance" 
FOR SELECT USING (true);

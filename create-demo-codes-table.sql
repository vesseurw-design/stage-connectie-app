-- =======================================================
-- StageConnectie: DemoCodes tabel voor GHPC Hoofdplatform
-- =======================================================
-- Voer deze query eenmalig uit in de Supabase SQL Editor
-- van je GHPC / StageConnectie-EU project.

CREATE TABLE IF NOT EXISTS public."DemoCodes" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    recipient_name TEXT NOT NULL,
    expires_at DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT
);

-- Row Level Security (RLS) inschakelen
ALTER TABLE public."DemoCodes" ENABLE ROW LEVEL SECURITY;

-- Iedereen mag demo-codes valideren (read-only voor geldige check)
CREATE POLICY "DemoCodes_read_all" ON public."DemoCodes"
    FOR SELECT USING (true);

-- Invoegen, bewerken en verwijderen toestaan
CREATE POLICY "DemoCodes_insert_all" ON public."DemoCodes"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "DemoCodes_update_all" ON public."DemoCodes"
    FOR UPDATE USING (true);

CREATE POLICY "DemoCodes_delete_all" ON public."DemoCodes"
    FOR DELETE USING (true);

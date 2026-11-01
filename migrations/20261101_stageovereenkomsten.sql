-- ============================================================================
-- MIGRATIE: DIGITALE STAGEOVEREENKOMSTEN (PDF ONDERTEKENING & AVG-SLOT)
-- Veilig uit te voeren in de Supabase SQL Editor (wijzigt geen bestaande tabellen)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."Stageovereenkomsten" (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public."Students"(id) ON DELETE CASCADE,
    student_name TEXT,
    company_id UUID REFERENCES public."Bedrijven"(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES public.stagebegeleiders(id) ON DELETE SET NULL,
    storage_path TEXT,
    pdf_base64 TEXT,
    status TEXT DEFAULT 'pending_signatures',
    signatures JSONB DEFAULT '{}'::jsonb,
    signature_boxes JSONB DEFAULT '{}'::jsonb,
    printed_by_admin_at TIMESTAMP WITH TIME ZONE,
    printed_by_supervisor_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT stageovereenkomsten_student_unique UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_stageovereenkomsten_student ON public."Stageovereenkomsten"(student_id);

ALTER TABLE public."Stageovereenkomsten" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stageovereenkomsten_access_all_auth" ON public."Stageovereenkomsten";
CREATE POLICY "stageovereenkomsten_access_all_auth" ON public."Stageovereenkomsten"
    FOR ALL
    USING (true)
    WITH CHECK (true);

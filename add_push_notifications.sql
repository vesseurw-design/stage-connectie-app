-- SQL MIGRATIE: WEB PUSH NOTIFICATIES ONDERSTEUNING (100% GRATIS, GEEN TELEFOONNUMMERS)
-- Voegt de push_subscription kolom toe aan Students en maakt optioneel push_subscriptions aan

-- 1. Voeg push_subscription JSONB kolom toe aan Students
ALTER TABLE IF EXISTS public."Students"
ADD COLUMN IF NOT EXISTS push_subscription JSONB;

-- 2. Optioneel: aparte tabel voor meerdere apparaten (bijv. telefoon én laptop van stagiair)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public."Students"(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS inschakelen
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy voor stagiairs en service-role om push subscriptions te beheren
DROP POLICY IF EXISTS "students_manage_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "students_manage_push_subscriptions" ON public.push_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Index voor snelle lookup op student_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_student_id ON public.push_subscriptions(student_id);

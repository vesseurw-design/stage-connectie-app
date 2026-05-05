CREATE TABLE IF NOT EXISTS public."Vakanties" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public."Vakanties" ENABLE ROW LEVEL SECURITY;

-- Everyone (including anon and authenticated) can read holidays
CREATE POLICY "Vakanties_read_all" ON public."Vakanties"
    FOR SELECT
    USING (true);

-- We don't need a specific insert policy here because you will manage it directly in the Supabase Dashboard (which bypasses RLS)
-- Later, if we build an Admin UI, we can add a specific policy here.

-- Let's insert a default holiday just for testing/as an example
INSERT INTO public."Vakanties" (name, start_date, end_date)
VALUES ('Zomervakantie 2026', '2026-07-20', '2026-08-30')
ON CONFLICT DO NOTHING;

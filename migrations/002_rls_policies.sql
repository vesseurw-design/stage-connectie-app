-- 002_rls_policies.sql
-- Example Row-Level Security (RLS) policies using `public.profiles` and `public.company_employers`.
-- Adjust table names/logic to match your actual schema before applying.

BEGIN;

-- Enable RLS on tables that contain sensitive data
ALTER TABLE IF EXISTS public.Attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.Students ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.Bedrijven ENABLE ROW LEVEL SECURITY;

-- Policy: admins have full access to Attendance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendance') THEN
    PERFORM 1;
    -- Create policy if not exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_admin_full'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY attendance_admin_full ON public.Attendance
        USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin'))
        WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin'));
      $sql$;
    END IF;
  END IF;
END$$;

-- Policy: employers can manage attendance for companies they belong to
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='attendance') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='attendance' AND policyname='attendance_employer'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY attendance_employer ON public.Attendance
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.company_employers ce
            WHERE ce.user_id = auth.uid AND ce.company_id = public.Attendance.employer_id
          )
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin')
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.company_employers ce
            WHERE ce.user_id = auth.uid AND ce.company_id = public.Attendance.employer_id
          )
          OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin')
        );
      $sql$;
    END IF;
  END IF;
END$$;

-- Policy examples for Students: admin-only for updates/inserts, read allowed to admins and supervisors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='students') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_admin_modify'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY students_admin_modify ON public.Students
        USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin'))
        WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role = 'admin'));
      $sql$;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='students' AND policyname='students_read_staff'
    ) THEN
      EXECUTE $sql$
        CREATE POLICY students_read_staff ON public.Students
        FOR SELECT
        USING (
          EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid AND p.role IN ('admin','supervisor'))
        );
      $sql$;
    END IF;
  END IF;
END$$;

COMMIT;

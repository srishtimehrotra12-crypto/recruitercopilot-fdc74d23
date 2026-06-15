DO $$
DECLARE
  shared_owner constant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name = 'owner_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.jobs ALTER COLUMN owner_id SET DEFAULT %L::uuid', shared_owner);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'owner_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.candidates ALTER COLUMN owner_id SET DEFAULT %L::uuid', shared_owner);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'applications' AND column_name = 'owner_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.applications ALTER COLUMN owner_id SET DEFAULT %L::uuid', shared_owner);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'activity_log' AND column_name = 'owner_id'
  ) THEN
    EXECUTE format('ALTER TABLE public.activity_log ALTER COLUMN owner_id SET DEFAULT %L::uuid', shared_owner);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_log TO anon;

DROP POLICY IF EXISTS "Workspace visitors manage jobs" ON public.jobs;
CREATE POLICY "Workspace visitors manage jobs"
ON public.jobs
FOR ALL
TO anon
USING (owner_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (owner_id = '00000000-0000-0000-0000-000000000000'::uuid);

DROP POLICY IF EXISTS "Workspace visitors manage candidates" ON public.candidates;
CREATE POLICY "Workspace visitors manage candidates"
ON public.candidates
FOR ALL
TO anon
USING (owner_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (owner_id = '00000000-0000-0000-0000-000000000000'::uuid);

DROP POLICY IF EXISTS "Workspace visitors manage applications" ON public.applications;
CREATE POLICY "Workspace visitors manage applications"
ON public.applications
FOR ALL
TO anon
USING (owner_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (owner_id = '00000000-0000-0000-0000-000000000000'::uuid);

DROP POLICY IF EXISTS "Workspace visitors manage activity" ON public.activity_log;
CREATE POLICY "Workspace visitors manage activity"
ON public.activity_log
FOR ALL
TO anon
USING (owner_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (owner_id = '00000000-0000-0000-0000-000000000000'::uuid);
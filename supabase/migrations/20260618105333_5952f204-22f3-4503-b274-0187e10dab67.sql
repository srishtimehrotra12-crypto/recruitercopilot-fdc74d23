
-- Drop anon nil-UUID policies, scope everything to auth.uid()
DROP POLICY IF EXISTS "Workspace visitors manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "Workspace visitors manage candidates" ON public.candidates;
DROP POLICY IF EXISTS "Workspace visitors manage applications" ON public.applications;
DROP POLICY IF EXISTS "Workspace visitors manage activity" ON public.activity_log;

-- Make sure existing per-user policies exist; recreate cleanly
DROP POLICY IF EXISTS "Owners manage own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Owners manage own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Owners manage own applications" ON public.applications;
DROP POLICY IF EXISTS "Owners manage own activity" ON public.activity_log;

CREATE POLICY "Owners manage own jobs" ON public.jobs
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage own candidates" ON public.candidates
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage own applications" ON public.applications
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners manage own activity" ON public.activity_log
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Default owner_id to auth.uid() so client code can omit it
ALTER TABLE public.jobs ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.candidates ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.applications ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.activity_log ALTER COLUMN owner_id SET DEFAULT auth.uid();

-- Remove anon grants on sensitive tables (authenticated keeps access)
REVOKE ALL ON public.jobs FROM anon;
REVOKE ALL ON public.candidates FROM anon;
REVOKE ALL ON public.applications FROM anon;
REVOKE ALL ON public.activity_log FROM anon;

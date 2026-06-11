
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_candidates_tags ON public.candidates USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_candidates_skills ON public.candidates USING gin (skills);
CREATE INDEX IF NOT EXISTS idx_candidates_owner ON public.candidates (owner_id);

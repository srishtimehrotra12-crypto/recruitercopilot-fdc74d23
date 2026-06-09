## Recruitment Command Center — Phased Build Plan

Big scope (6 features + per-candidate tech questions). I'll ship in **5 phases**, each fully working before the next. You approve once; I execute Phase 1 this turn and pause for review before Phase 2.

---

### Phase 1 — Foundation (this turn)
**Goal:** Login + app shell. No features broken; current screening flow becomes "New Screening" inside the shell.

- Email/password auth (signup, login, logout, `/auth` page, protected routes)
- `profiles` table (id, email, full_name, created_at) + auto-create trigger on signup
- `user_roles` table + `has_role()` security-definer function (recruiter / admin)
- Sidebar shell layout: **Dashboard · Jobs · Pipeline · Talent DB · Sourcing · Analytics · Screening**
- Move current `Index.tsx` screening UI under `/screening` route (zero feature loss)
- Dashboard placeholder with counts (jobs, candidates, in-pipeline)
- Dark mode toggle in header (already partially supported)

### Phase 2 — Jobs + ATS Pipeline (Feature 1)
- `jobs` table (title, description, status, owner)
- `candidates` table (name, email, phone, resume_url, parsed_json, source)
- `pipeline_stages` (Applied → Screening → Interview → Offer → Hired/Rejected) per job
- `applications` join (candidate ↔ job ↔ stage, with notes/score)
- Kanban board (drag-drop between stages, dnd-kit)
- Activity log per candidate
- "Add to pipeline" button on screening results

### Phase 3 — Talent Database (Feature 2) + Per-Candidate Tech Questions
- Search/filter all candidates across jobs (skills, experience, source, stage)
- Tags, saved searches, candidate detail drawer
- **Upgrade Interview Kit:** edge function reads each candidate's parsed resume (skills, projects, gaps, seniority) and generates *tailored* technical questions with expected answer signals — not generic ones
- Semantic search via pgvector + Lovable AI embeddings (optional toggle)

### Phase 4 — Sourcing (Feature 3) + Dedupe (Feature 4)
- LinkedIn-style profile paste/import → AI parse → add to Talent DB
- Boolean string builder for sourcing
- Fuzzy dedupe on email/phone/name+company; merge UI showing which fields came from where

### Phase 5 — Analytics (Feature 5) + Collaboration (Feature 6)
- Funnel metrics, time-to-hire, source effectiveness, recruiter leaderboard
- Per-job and global dashboards (recharts)
- Comments/mentions on candidates, shared notes, role-based permissions

---

### Technical notes
- Stack stays React + Vite + Tailwind + shadcn + Lovable Cloud (Supabase)
- All tables: RLS on, GRANTs, owner-scoped policies, `has_role()` for admin overrides
- Existing edge functions (`generate-reports`, `parse-jd`) keep working; new ones added per phase
- Screening localStorage data stays for now; Phase 2 adds "Save to Talent DB" to migrate it

### What I need from you
Just one thing before I start Phase 1: **profile fields** — is `email + full_name` enough, or do you also want `avatar_url`, `company`, `role_title`? I'll default to `email + full_name + avatar_url` if you don't specify.

Approve and I'll ship Phase 1 immediately.
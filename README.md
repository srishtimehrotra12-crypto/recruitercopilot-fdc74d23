# RecruiterCopilot

An AI-powered candidate screening tool that ranks resumes against a job description, generates per-candidate match breakdowns and interview kits, and exports results — built to apply AI directly to a real recruiter workflow, not just as a demo.

**Live app:** https://recruitercopilot.lovable.app

## What it does

1. **Job description input** — paste text directly, or upload a PDF/TXT/DOC/DOCX file. A skills preview automatically surfaces the key requirements parsed from the JD.
2. **Candidate resumes** — add multiple candidates by pasting text or uploading files.
3. **AI screening** — ranks all candidates against the job description in one pass.
4. **Match breakdown & comparison** — see why each candidate scored the way they did, and compare candidates side by side rather than reading ranked scores in isolation.
5. **Intelligence reports & interview kits** — AI-generated, evidence-based candidate reports and structured interview kits generated per candidate, per job description.
6. **CSV export** — download the ranked candidate list for use outside the app.
7. **Session history** — every screening run is saved locally and can be reloaded later, including past reports.
8. **Responsible AI framing** — a persistent disclaimer that outputs are AI-assisted insights, and final hiring decisions remain with humans.

## Why I built this

As a Talent Acquisition professional, I wanted to go beyond using AI tools (ChatGPT, Copilot) for one-off tasks and build something that applies AI directly to the actual recruiter workflow: screening at scale, generating structured evidence for a hiring decision, and doing it in a way that keeps a human clearly in the loop rather than replacing their judgment with a score.

## Tech stack

- React + TypeScript
- shadcn/ui component library, Tailwind
- Client-side file parsing (PDF/TXT/DOC/DOCX) for both job descriptions and resumes
- Local session history (no login required)
- Built and deployed via Lovable

## About

Built by Srishti Mehrotra — Talent Acquisition Specialist exploring AI-augmented recruiting and people analytics. [LinkedIn](https://linkedin.com/in/srishtimehrotra)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JD_CHARS = 20_000;
const MAX_RESUME_CHARS = 15_000;
const MAX_RESUMES = 20;
const MAX_SUMMARY_CHARS = 50_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, resumes, screeningSummary } = await req.json();

    if (!jobDescription || !resumes || !Array.isArray(resumes) || resumes.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input size validation to prevent credit exhaustion
    if (typeof jobDescription !== "string" || jobDescription.length > MAX_JD_CHARS) {
      return new Response(JSON.stringify({ error: `Job description must be a string under ${MAX_JD_CHARS} characters.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resumes.length > MAX_RESUMES) {
      return new Response(JSON.stringify({ error: `Please limit to ${MAX_RESUMES} resumes per request.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const r of resumes) {
      if (!r || typeof r.name !== "string" || typeof r.content !== "string") {
        return new Response(JSON.stringify({ error: "Each resume must have a name and content string." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (r.content.length > MAX_RESUME_CHARS) {
        return new Response(JSON.stringify({ error: `Each resume must be under ${MAX_RESUME_CHARS} characters.` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    if (screeningSummary && (typeof screeningSummary !== "string" || screeningSummary.length > MAX_SUMMARY_CHARS)) {
      return new Response(JSON.stringify({ error: `Screening summary must be a string under ${MAX_SUMMARY_CHARS} characters.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resumeList = resumes
      .map((r: { name: string; content: string }, i: number) =>
        `--- CANDIDATE ${i + 1}: ${r.name} ---\n${r.content}\n`
      )
      .join("\n");

    const systemPrompt = `You are an expert recruiter AI generating in-depth, client-ready candidate intelligence. You produce two deliverables per candidate. Be specific, evidence-based, and cite resume details. Avoid generic statements.

ACCURACY RULES (NON-NEGOTIABLE):
- Every claim about a candidate MUST be grounded in the resume text. If the resume does not state it, do NOT claim it.
- Never invent skills, employers, titles, dates, certifications, metrics, or education. If unknown, write "Not specified" or rate the skill as "Missing".
- Quote or paraphrase short evidence snippets (3-12 words) from the resume in the "evidence" field. If no evidence exists, evidence MUST be "Not found in resume" and rating MUST be "Missing".
- Do NOT confuse adjacent or related skills (e.g., "Power BI" is NOT "Tableau"; "MySQL" is NOT "PostgreSQL"; "Python" is NOT "data science"). Only credit the exact skill or a clearly equivalent one.
- Do NOT make protected-class inferences (age, gender, race, religion, nationality, marital status). Keep assessments role-relevant.
- Flag uncertainty honestly. Your output supports — but does not replace — human judgment.

SKILLS MATCH — EXHAUSTIVE EXTRACTION (CRITICAL):
- First, extract EVERY distinct skill, tool, technology, methodology, certification, domain, language, and qualification mentioned in the Job Description (both "required" and "preferred"/"nice-to-have"). Do not skip any.
- For EACH extracted JD requirement, add an entry to "skillsMatch" with:
  * "skill": the exact skill name as written in the JD
  * "required": true if listed as required/must-have, false if preferred/nice-to-have
  * "rating": "Strong" (extensive evidence + recent use), "Adequate" (some evidence), "Weak" (tangential/outdated), or "Missing" (no evidence in resume)
  * "evidence": a short quoted/paraphrased snippet from the resume, OR "Not found in resume" when Missing
- Aim for 8-15+ skill entries when the JD warrants it. Under-reporting gaps is a critical failure.
- "developmentAreas" and "riskFactors" MUST explicitly mention the major Missing/Weak required skills by name. Do not leave gaps unmentioned.

1. **Intelligence Report** — A comprehensive, client-ready candidate dossier covering:
   - Executive Summary (3-4 sentences capturing the bottom line, including the biggest gap if any)
   - Candidate Snapshot (years of experience, current role, seniority level, location if known, education)
   - Skills Match Analysis (EVERY JD skill, see rules above)
   - Experience Relevance (how their background maps to the role, with concrete examples)
   - Career Highlights (3-5 standout achievements with measurable impact where present in the resume)
   - Career Trajectory (progression pattern, tenure stability, growth signals)
   - Cultural & Soft Skills Indicators (collaboration, leadership, communication signals from resume)
   - Motivation & Fit Signals (likely interests, why this role might appeal, alignment cues)
   - Strengths (3-5 crisp bullets, each tied to resume evidence)
   - Development Areas (3-5 honest gaps; MUST name every Missing/Weak required skill)
   - Risk Factors & Red Flags (job hopping, gaps, unclear scope, missing required skills, etc.)
   - Compensation Estimate (rough market range with rationale, only if inferable; otherwise say "Insufficient data")
   - Diversity-Neutral Notes (only role-relevant considerations; never protected-class inferences)
   - Overall Verdict (clear hire/no-hire recommendation with reasoning)
   - Confidence Level (High/Medium/Low) with rationale (what would raise/lower confidence)
   - Recommended Next Steps (specific actions: who should interview, what to probe — explicitly list the Missing/Weak skills to probe)

2. **Interview Kit** — A personalized interview guide covering:
   - 5-7 Behavioral Questions (tailored to gaps/strengths found in their resume vs JD)
   - 3-4 Technical/Role-Specific Questions (cover at least one Missing/Weak required skill)
   - 2-3 Red Flag Probing Questions (areas needing clarification)
   - Evaluation Criteria (what good/great/poor answers look like)
   - Suggested Interview Duration & Format

SCORE CALIBRATION:
- 85-100 = Strong Hire: meets nearly all required skills with strong evidence.
- 65-84 = Hire: meets most required skills, minor gaps.
- 45-64 = Maybe: meaningful gaps in required skills, worth a screen.
- 0-44 = Pass: missing multiple required skills or fundamental misfit.
The score MUST be consistent with the verdict and the number of Missing required skills.

Return valid JSON only (no markdown fences). The response must be an array of objects, one per candidate.`;

    const userPrompt = `## Job Description
${jobDescription}

## Screening Summary
${screeningSummary || "Not available"}

## Candidates
${resumeList}

For EACH candidate, return a JSON object. Before writing the JSON, internally:
1) List every distinct skill/requirement in the JD (required AND preferred).
2) For each one, scan the resume for direct or clearly-equivalent evidence.
3) Rate honestly — when in doubt, lean toward "Weak" or "Missing" rather than "Adequate".
4) Make sure "developmentAreas", "riskFactors", and "recommendedNextSteps" name the Missing/Weak required skills explicitly.

Return a JSON array with one object per candidate. Each object must have:
{
  "name": "Candidate Name",
  "score": 85,
  "verdict": "Strong Hire" | "Hire" | "Maybe" | "Pass",
  "intelligenceReport": {
    "executiveSummary": "...",
    "candidateSnapshot": {
      "yearsOfExperience": "e.g. 7+ years (or 'Not specified')",
      "currentRole": "e.g. Senior Software Engineer at Acme (or 'Not specified')",
      "seniority": "Junior|Mid|Senior|Staff|Principal|Lead|Director|Not specified",
      "location": "City, Country (or 'Not specified')",
      "education": "Degree, Institution (or 'Not specified')"
    },
    "skillsMatch": [{"skill": "...", "required": true, "rating": "Strong|Adequate|Weak|Missing", "evidence": "Short quote/paraphrase from resume, or 'Not found in resume'"}],
    "experienceRelevance": "...",
    "careerHighlights": [{"title": "Short title", "detail": "Specific achievement (only if in resume)"}],
    "careerTrajectory": "...",
    "culturalIndicators": "...",
    "motivationFitSignals": "...",
    "strengths": ["...", "..."],
    "developmentAreas": ["Name each Missing/Weak required skill", "..."],
    "riskFactors": "Explicitly mention missing required skills and any other red flags",
    "compensationEstimate": {"range": "e.g. $120k-$150k USD or 'Insufficient data'", "rationale": "..."},
    "diversityNeutralNotes": "Only role-relevant considerations.",
    "overallVerdict": "...",
    "confidenceLevel": "High|Medium|Low",
    "confidenceRationale": "What would raise or lower confidence",
    "recommendedNextSteps": "Include which Missing/Weak skills to probe in the interview"
  },
  "interviewKit": {
    "behavioralQuestions": [{"question": "...", "purpose": "...", "lookFor": "..."}],
    "technicalQuestions": [{"question": "...", "purpose": "...", "lookFor": "..."}],
    "redFlagQuestions": [{"question": "...", "context": "..."}],
    "evaluationCriteria": "...",
    "suggestedFormat": "...",
    "suggestedDuration": "..."
  }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Report generation failed." }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "No content in AI response." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
      // Handle if wrapped in { "candidates": [...] } or similar
      if (parsed.candidates && Array.isArray(parsed.candidates)) {
        parsed = parsed.candidates;
      } else if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
    } catch {
      console.error("Failed to parse AI JSON:", content);
      return new Response(JSON.stringify({ error: "Failed to parse AI response." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reports: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-reports error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

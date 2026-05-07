import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JD_CHARS = 20_000;
const MAX_RESUME_CHARS = 15_000;
const MAX_RESUMES = 20;
const MAX_SUMMARY_CHARS = 50_000;

const SYSTEM_PROMPT = `You are an expert recruiter AI generating in-depth, client-ready candidate intelligence for ONE candidate at a time. Be specific, evidence-based, and cite resume details. Avoid generic statements.

ACCURACY RULES (NON-NEGOTIABLE):
- Every claim about the candidate MUST be grounded in the resume text. If the resume does not state it, do NOT claim it.
- Never invent skills, employers, titles, dates, certifications, metrics, or education. If unknown, write "Not specified" or rate the skill as "Missing".
- Quote or paraphrase short evidence snippets (3-12 words) from the resume in the "evidence" field. If no evidence exists, evidence MUST be "Not found in resume" and rating MUST be "Missing".
- Do NOT confuse adjacent or related skills (e.g., "Power BI" is NOT "Tableau"; "MySQL" is NOT "PostgreSQL"). Only credit the exact skill or a clearly equivalent one.
- Do NOT make protected-class inferences (age, gender, race, religion, nationality, marital status). Keep assessments role-relevant.
- Flag uncertainty honestly. Your output supports — but does not replace — human judgment.

SKILLS MATCH — EXHAUSTIVE EXTRACTION (CRITICAL):
- Extract EVERY distinct skill, tool, technology, methodology, certification, domain, language, and qualification mentioned in the Job Description (both required and preferred).
- For EACH JD requirement, add an entry with: "skill", "required" (bool), "rating" (Strong|Adequate|Weak|Missing), "evidence" (short snippet or "Not found in resume").
- Aim for 8-15+ skill entries when JD warrants. Under-reporting gaps is a critical failure.
- "developmentAreas", "riskFactors", and "recommendedNextSteps" MUST explicitly name every Missing/Weak required skill.

SCORE CALIBRATION:
- 85-100 Strong Hire | 65-84 Hire | 45-64 Maybe | 0-44 Pass.
- Score MUST be consistent with verdict and number of Missing required skills.

Return valid JSON only (no markdown fences). The response is a single object for this one candidate.`;

const buildUserPrompt = (jd: string, summary: string, name: string, content: string) => `## Job Description
${jd}

## Screening Summary
${summary || "Not available"}

## Candidate: ${name}
${content}

Return a single JSON object with this exact shape:
{
  "name": "${name}",
  "score": 0,
  "verdict": "Strong Hire" | "Hire" | "Maybe" | "Pass",
  "intelligenceReport": {
    "executiveSummary": "...",
    "candidateSnapshot": {
      "yearsOfExperience": "...",
      "currentRole": "...",
      "seniority": "Junior|Mid|Senior|Staff|Principal|Lead|Director|Not specified",
      "location": "...",
      "education": "..."
    },
    "skillsMatch": [{"skill": "...", "required": true, "rating": "Strong|Adequate|Weak|Missing", "evidence": "..."}],
    "experienceRelevance": "...",
    "careerHighlights": [{"title": "...", "detail": "..."}],
    "careerTrajectory": "...",
    "culturalIndicators": "...",
    "motivationFitSignals": "...",
    "strengths": ["..."],
    "developmentAreas": ["Name each Missing/Weak required skill"],
    "riskFactors": "Explicitly mention missing required skills and red flags",
    "compensationEstimate": {"range": "...", "rationale": "..."},
    "diversityNeutralNotes": "...",
    "overallVerdict": "...",
    "confidenceLevel": "High|Medium|Low",
    "confidenceRationale": "...",
    "recommendedNextSteps": "Include which Missing/Weak skills to probe"
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

async function generateForCandidate(
  apiKey: string,
  jd: string,
  summary: string,
  candidate: { name: string; content: string }
) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(jd, summary, candidate.name, candidate.content) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const t = await response.text();
    console.error(`AI error for ${candidate.name}:`, response.status, t);
    throw new Error(`AI gateway ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = JSON.parse(content);
  if (!parsed.name) parsed.name = candidate.name;
  return parsed;
}

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

    // Process all candidates in parallel for speed
    const settled = await Promise.allSettled(
      resumes.map((r: { name: string; content: string }) =>
        generateForCandidate(LOVABLE_API_KEY, jobDescription, screeningSummary || "", r)
      )
    );

    const reports: unknown[] = [];
    const failures: string[] = [];
    settled.forEach((s, i) => {
      if (s.status === "fulfilled") reports.push(s.value);
      else failures.push(resumes[i].name);
    });

    if (reports.length === 0) {
      return new Response(JSON.stringify({ error: `Report generation failed for all candidates: ${failures.join(", ")}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ reports, failures }), {
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

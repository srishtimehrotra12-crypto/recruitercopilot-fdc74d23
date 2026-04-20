import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_JD_CHARS = 20_000;
const MAX_RESUME_CHARS = 15_000;
const MAX_RESUMES = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription, resumes } = await req.json();
    
    if (!jobDescription || !resumes || !Array.isArray(resumes) || resumes.length === 0) {
      return new Response(JSON.stringify({ error: "Please provide a job description and at least one resume." }), {
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please try again later." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resumeList = resumes.map((r: { name: string; content: string }, i: number) => 
      `--- CANDIDATE ${i + 1}: ${r.name} ---\n${r.content}\n`
    ).join("\n");

    const systemPrompt = `You are an expert recruiter AI assistant. You screen and rank candidates against job descriptions with strict accuracy.

ACCURACY RULES (NON-NEGOTIABLE):
- Every claim MUST be grounded in the resume text. Never invent skills, employers, titles, dates, certifications, or metrics.
- Do not confuse adjacent skills (e.g., Power BI ≠ Tableau, MySQL ≠ PostgreSQL). Only credit exact or clearly equivalent skills.
- If something is not in the resume, treat it as a gap — never fill it in with assumptions.

GAP COMPLETENESS (CRITICAL):
- First mentally list every required and preferred skill in the JD.
- The "Gaps" section for each candidate MUST explicitly name every required skill that is missing or only weakly evidenced. Do not omit major gaps.
- If a required skill is missing, the score must reflect it (see calibration below).

SCORE CALIBRATION:
- 85-100 = Strong Hire: meets nearly all required skills with strong evidence.
- 65-84 = Hire: meets most required skills, minor gaps.
- 45-64 = Maybe: meaningful gaps in required skills.
- 0-44 = Pass: missing multiple required skills or fundamental misfit.

For each candidate, provide:
1. A match score from 0-100 (calibrated as above)
2. Key strengths (each tied to specific resume evidence)
3. Gaps or concerns (every missing required skill named explicitly)
4. A brief recommendation (Strong Hire / Hire / Maybe / Pass)

Be concise, fair, and data-driven.`;

    const userPrompt = `## Job Description
${jobDescription}

## Candidates to Screen
${resumeList}

Please rank all candidates from best to worst fit. For each candidate provide:
- **Score**: 0-100
- **Strengths**: Key matching qualifications, each backed by resume evidence
- **Gaps**: Every missing or weakly-evidenced required skill, named explicitly
- **Recommendation**: Strong Hire / Hire / Maybe / Pass

After the per-candidate sections, include a "## Summary Comparison" markdown table comparing the candidates side-by-side on the most important JD criteria.

Format your response clearly with each candidate as a section.`;

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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI screening failed. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("screen-candidates error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const resumeList = resumes
      .map((r: { name: string; content: string }, i: number) =>
        `--- CANDIDATE ${i + 1}: ${r.name} ---\n${r.content}\n`
      )
      .join("\n");

    const systemPrompt = `You are an expert recruiter AI generating in-depth, client-ready candidate intelligence. You produce two deliverables per candidate. Be specific, evidence-based, and cite resume details. Avoid generic statements.

IMPORTANT GUIDELINES:
- Stay objective and evidence-based. Quote or paraphrase resume specifics.
- Do NOT make protected-class inferences (age, gender, race, religion, nationality, marital status). Keep assessments role-relevant.
- Flag uncertainty honestly. If information is missing, say so rather than inventing.
- Your output supports — but does not replace — human judgment.

1. **Intelligence Report** — A comprehensive, client-ready candidate dossier covering:
   - Executive Summary (3-4 sentences capturing the bottom line)
   - Candidate Snapshot (years of experience, current role, seniority level, location if known, education)
   - Skills Match Analysis (every required skill with rating + 1-line evidence from the resume)
   - Experience Relevance (how their background maps to the role, with concrete examples)
   - Career Highlights (3-5 standout achievements with measurable impact where possible)
   - Career Trajectory (progression pattern, tenure stability, growth signals)
   - Cultural & Soft Skills Indicators (collaboration, leadership, communication signals from resume)
   - Motivation & Fit Signals (likely interests, why this role might appeal, alignment cues)
   - Strengths (3-5 crisp bullets)
   - Development Areas (3-5 honest gaps or areas to probe)
   - Risk Factors & Red Flags (job hopping, gaps, unclear scope, etc.)
   - Compensation Estimate (rough market range with rationale, if inferable)
   - Diversity-Neutral Notes (only role-relevant considerations; never protected-class inferences)
   - Overall Verdict (clear hire/no-hire recommendation with reasoning)
   - Confidence Level (High/Medium/Low) with rationale (what would raise/lower confidence)
   - Recommended Next Steps (specific actions: who should interview, what to probe)

2. **Interview Kit** — A personalized interview guide covering:
   - 5-7 Behavioral Questions (tailored to gaps/strengths found in their resume vs JD)
   - 3-4 Technical/Role-Specific Questions
   - 2-3 Red Flag Probing Questions (areas needing clarification)
   - Evaluation Criteria (what good/great/poor answers look like)
   - Suggested Interview Duration & Format

Return valid JSON only (no markdown fences). The response must be an array of objects, one per candidate.`;

    const userPrompt = `## Job Description
${jobDescription}

## Screening Summary
${screeningSummary || "Not available"}

## Candidates
${resumeList}

Return a JSON array with one object per candidate. Each object must have:
{
  "name": "Candidate Name",
  "score": 85,
  "verdict": "Strong Hire" | "Hire" | "Maybe" | "Pass",
  "intelligenceReport": {
    "executiveSummary": "...",
    "candidateSnapshot": {
      "yearsOfExperience": "e.g. 7+ years",
      "currentRole": "e.g. Senior Software Engineer at Acme",
      "seniority": "Junior|Mid|Senior|Staff|Principal|Lead|Director",
      "location": "City, Country (or 'Not specified')",
      "education": "Degree, Institution (or 'Not specified')"
    },
    "skillsMatch": [{"skill": "...", "required": true, "rating": "Strong|Adequate|Weak|Missing", "evidence": "1-line proof from resume"}],
    "experienceRelevance": "...",
    "careerHighlights": [{"title": "Short title", "detail": "Specific achievement with metric if available"}],
    "careerTrajectory": "...",
    "culturalIndicators": "...",
    "motivationFitSignals": "...",
    "strengths": ["...", "..."],
    "developmentAreas": ["...", "..."],
    "riskFactors": "...",
    "compensationEstimate": {"range": "e.g. $120k-$150k USD", "rationale": "..."},
    "diversityNeutralNotes": "Only role-relevant considerations.",
    "overallVerdict": "...",
    "confidenceLevel": "High|Medium|Low",
    "confidenceRationale": "What would raise or lower confidence",
    "recommendedNextSteps": "..."
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

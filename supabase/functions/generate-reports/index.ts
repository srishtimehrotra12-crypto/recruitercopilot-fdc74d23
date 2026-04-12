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

    const systemPrompt = `You are an expert recruiter AI. You generate two deliverables per candidate:

1. **Intelligence Report** — A polished, client-ready candidate assessment covering:
   - Executive Summary (2-3 sentences)
   - Skills Match Analysis (table of required vs candidate skills with ratings)
   - Experience Relevance (how their background maps to the role)
   - Cultural & Soft Skills Indicators
   - Risk Factors & Red Flags
   - Overall Verdict with confidence level (High/Medium/Low)
   - Recommended Next Steps

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
    "skillsMatch": [{"skill": "...", "required": true, "rating": "Strong|Adequate|Weak|Missing"}],
    "experienceRelevance": "...",
    "culturalIndicators": "...",
    "riskFactors": "...",
    "overallVerdict": "...",
    "confidenceLevel": "High|Medium|Low",
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

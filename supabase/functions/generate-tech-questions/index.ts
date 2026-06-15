import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });

    const body = await req.json().catch(() => ({}));
    const candidateId = typeof body?.candidateId === "string" ? body.candidateId : "";
    const jobId = typeof body?.jobId === "string" ? body.jobId : null;
    const seniority = typeof body?.seniority === "string" ? body.seniority.slice(0, 50) : null;
    const focus = typeof body?.focus === "string" ? body.focus.slice(0, 200) : null;
    const count = Math.min(Math.max(Number(body?.count) || 8, 3), 15);

    if (!candidateId) {
      return new Response(JSON.stringify({ error: "candidateId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("id,name,resume_text,parsed_json,skills,notes")
      .eq("id", candidateId)
      .maybeSingle();
    if (cErr || !candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let job: any = null;
    if (jobId) {
      const { data } = await supabase
        .from("jobs")
        .select("title,description")
        .eq("id", jobId)
        .maybeSingle();
      job = data;
    }

    const resumeText = (candidate.resume_text || "").slice(0, 12_000);
    const parsed = candidate.parsed_json ? JSON.stringify(candidate.parsed_json).slice(0, 6_000) : "";
    const skills = (candidate.skills || []).join(", ");

    const systemPrompt = `You are a senior technical interviewer. Generate sharp, candidate-specific technical interview questions grounded ONLY in evidence from the candidate's resume and (when provided) the job description.

RULES:
- Tie every question to something concrete the candidate has worked on (tech, project, role, claim).
- Mix difficulty: a few foundational checks, several deep-dive on claimed expertise, at least one probing a likely gap.
- No generic questions ("What is REST?"). Be specific to their stack and projects.
- For each question, include the "signal" — what a strong answer should demonstrate.
- Output STRICT JSON only, no markdown, no commentary.`;

    const userPrompt = `## Candidate
Name: ${candidate.name}
Self-reported skills: ${skills || "(none listed)"}
${candidate.notes ? `Recruiter notes: ${candidate.notes}\n` : ""}
${parsed ? `Parsed profile (JSON):\n${parsed}\n` : ""}
Resume:
${resumeText || "(no resume text on file)"}

${job ? `## Target role\nTitle: ${job.title}\nDescription:\n${(job.description || "").slice(0, 4000)}` : "## Target role\n(none specified — focus on the candidate's strongest claimed areas)"}

${seniority ? `Target seniority: ${seniority}` : ""}
${focus ? `Focus area requested: ${focus}` : ""}

Generate exactly ${count} questions. Output JSON in this exact shape:
{
  "questions": [
    {
      "topic": "string (e.g. 'Kafka consumer lag')",
      "difficulty": "easy" | "medium" | "hard",
      "category": "system_design" | "coding" | "debugging" | "behavioral_tech" | "deep_dive" | "gap_probe",
      "question": "string",
      "tied_to": "string — the resume claim/project/skill this is based on",
      "signal": "string — what a strong answer demonstrates",
      "follow_ups": ["string", ...]
    }
  ]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const content = data?.choices?.[0]?.message?.content ?? "{}";
    let parsedOut: any;
    try { parsedOut = JSON.parse(content); } catch { parsedOut = { questions: [] }; }

    return new Response(JSON.stringify(parsedOut), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-tech-questions error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

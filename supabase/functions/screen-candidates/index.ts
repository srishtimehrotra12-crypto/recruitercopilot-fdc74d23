import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    // Authenticate caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const systemPrompt = `You are an expert recruiter AI assistant. You screen and rank candidates against job descriptions.

For each candidate, provide:
1. A match score from 0-100
2. Key strengths (matching the JD)
3. Gaps or concerns
4. A brief recommendation

Be concise, fair, and data-driven. Focus on skills, experience, and qualifications mentioned in the JD.`;

    const userPrompt = `## Job Description
${jobDescription}

## Candidates to Screen
${resumeList}

Please rank all candidates from best to worst fit. For each candidate provide:
- **Score**: 0-100
- **Strengths**: Key matching qualifications
- **Gaps**: Missing requirements or concerns  
- **Recommendation**: Hire / Maybe / Pass

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are an expert technical recruiter. Given a job description, extract a complete and accurate list of skills the JD asks for.

Rules:
- Extract EVERY skill, tool, technology, framework, methodology, certification, language, and domain expertise mentioned.
- Classify each as either "required" (must-have, hard requirement, "must", "required", listed in qualifications/requirements) or "preferred" (nice-to-have, "preferred", "bonus", "plus", "good to have").
- Use the candidate-facing skill name (e.g., "Power BI", "SQL", "Stakeholder Management"), not whole sentences.
- Also extract role meta: job title, seniority, years of experience required, and key responsibilities (short bullets).
- Be exhaustive. Do not invent skills not present in the JD. Do not group multiple skills into one chip.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobDescription } = await req.json();
    if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Job description is too short to parse." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract skills from this job description:\n\n${jobDescription}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_jd_skills",
              description: "Return the structured list of skills and meta extracted from the JD.",
              parameters: {
                type: "object",
                properties: {
                  jobTitle: { type: "string" },
                  seniority: { type: "string" },
                  yearsOfExperience: { type: "string" },
                  requiredSkills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["technical", "tool", "soft", "domain", "certification", "language", "other"],
                        },
                        evidence: { type: "string", description: "Short quote/phrase from the JD." },
                      },
                      required: ["skill", "category"],
                      additionalProperties: false,
                    },
                  },
                  preferredSkills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        skill: { type: "string" },
                        category: {
                          type: "string",
                          enum: ["technical", "tool", "soft", "domain", "certification", "language", "other"],
                        },
                        evidence: { type: "string" },
                      },
                      required: ["skill", "category"],
                      additionalProperties: false,
                    },
                  },
                  keyResponsibilities: { type: "array", items: { type: "string" } },
                },
                required: ["requiredSkills", "preferredSkills"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_jd_skills" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Lovable AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to parse JD" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured skills" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-jd error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

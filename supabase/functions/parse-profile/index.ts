const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_INPUT = 20_000;

const systemPrompt = `You are a sourcing assistant that extracts a clean candidate profile from messy free-form text (LinkedIn bios, GitHub READMEs, portfolio pages, email signatures, resumes, recruiter notes).

Rules:
- Extract ONLY what is explicitly present. Never invent.
- Skills must be canonical, deduplicated short labels (e.g. "TypeScript", "AWS", "Product Management"). 5-20 entries typical.
- Tags = signal labels useful for sourcing (e.g. "senior", "remote", "open-to-work", "ex-FAANG", "fintech"). 0-8 entries.
- Source = where the profile came from if mentioned ("LinkedIn", "GitHub", "Referral"). Otherwise empty.
- current_title and current_company only if stated.
- location: city/region/country as written.
- years_experience: numeric estimate from clearly stated years; null if unclear.
- summary: 1-2 sentence neutral recap.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length < 30) {
      return new Response(JSON.stringify({ error: "Profile text is too short to parse." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > MAX_INPUT) {
      return new Response(JSON.stringify({ error: `Profile text must be under ${MAX_INPUT} characters.` }), {
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extract candidate profile from this text:\n\n${text}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_profile",
              description: "Return structured candidate profile.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                  phone: { type: "string" },
                  location: { type: "string" },
                  current_title: { type: "string" },
                  current_company: { type: "string" },
                  years_experience: { type: ["number", "null"] },
                  source: { type: "string" },
                  summary: { type: "string" },
                  skills: { type: "array", items: { type: "string" } },
                  tags: { type: "array", items: { type: "string" } },
                  links: { type: "array", items: { type: "string" } },
                },
                required: ["name", "skills", "tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_profile" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to parse profile" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "AI did not return structured profile" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(args);

    // Normalize skills/tags
    const dedupe = (arr: string[]) => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const v of arr || []) {
        const t = (v || "").trim();
        if (!t) continue;
        const k = t.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(t);
      }
      return out;
    };
    parsed.skills = dedupe(parsed.skills || []);
    parsed.tags = dedupe(parsed.tags || []);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

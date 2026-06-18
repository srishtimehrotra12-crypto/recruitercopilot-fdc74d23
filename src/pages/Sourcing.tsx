import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, UserPlus, GitMerge, AlertTriangle, Search, RotateCcw } from "lucide-react";

type ParsedProfile = {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  current_title?: string;
  current_company?: string;
  years_experience?: number | null;
  source?: string;
  summary?: string;
  skills?: string[];
  tags?: string[];
  links?: string[];
};

type CandidateMatch = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  skills: string[];
  tags: string[];
  source: string | null;
  resume_text: string | null;
  notes: string | null;
  match_reason: string;
};

const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

const dedupeArr = (arr: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const t = (v || "").trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
};

export default function Sourcing() {
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [profile, setProfile] = useState<ParsedProfile | null>(null);

  // editable form (mirrors profile after parse)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", source: "",
    skills: "", tags: "", notes: "", resume_text: "",
  });

  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<CandidateMatch[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("candidates")
      .select("id,name,email,phone,skills,tags,source,resume_text,notes,created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    setRecent(((data ?? []) as any[]).map((c) => ({ ...c, match_reason: "" })));
  };

  useEffect(() => { loadRecent(); }, []);

  const reset = () => {
    setRawText("");
    setProfile(null);
    setMatches([]);
    setForm({ name: "", email: "", phone: "", source: "", skills: "", tags: "", notes: "", resume_text: "" });
  };

  const parseWithAi = async () => {
    if (rawText.trim().length < 30) {
      toast.error("Paste more text — at least a few sentences.");
      return;
    }
    setParsing(true);
    setProfile(null);
    setMatches([]);
    try {
      const { data, error } = await supabase.functions.invoke("parse-profile", {
        body: { text: rawText },
      });
      if (error) throw error;
      const p = data as ParsedProfile;
      setProfile(p);
      setForm({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        source: p.source || "",
        skills: (p.skills || []).join(", "),
        tags: (p.tags || []).join(", "),
        notes: [
          p.current_title && p.current_company ? `${p.current_title} at ${p.current_company}` : p.current_title || p.current_company,
          p.location ? `Location: ${p.location}` : "",
          p.years_experience ? `${p.years_experience} yrs experience` : "",
          p.summary,
          (p.links || []).length ? `Links: ${(p.links || []).join(" | ")}` : "",
        ].filter(Boolean).join("\n"),
        resume_text: rawText,
      });
      await runDedupe(p);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to parse profile");
    } finally {
      setParsing(false);
    }
  };

  const runDedupe = async (p: ParsedProfile) => {
    setChecking(true);
    setMatches([]);
    try {
      const orFilters: string[] = [];
      if (p.email) orFilters.push(`email.ilike.${p.email.trim()}`);
      if (p.phone) {
        const digits = p.phone.replace(/\D/g, "");
        if (digits.length >= 7) orFilters.push(`phone.ilike.%${digits.slice(-7)}%`);
      }
      if (p.name) orFilters.push(`name.ilike.%${p.name.trim()}%`);

      if (!orFilters.length) { setChecking(false); return; }
      const { data, error } = await supabase
        .from("candidates")
        .select("id,name,email,phone,skills,tags,source,resume_text,notes")
        .or(orFilters.join(","))
        .limit(10);
      if (error) throw error;

      const enriched: CandidateMatch[] = (data ?? []).map((c: any) => {
        const reasons: string[] = [];
        if (p.email && c.email && c.email.toLowerCase() === p.email.toLowerCase()) reasons.push("email match");
        if (p.phone && c.phone) {
          const a = p.phone.replace(/\D/g, "").slice(-7);
          const b = c.phone.replace(/\D/g, "").slice(-7);
          if (a && a === b) reasons.push("phone match");
        }
        if (p.name && c.name && c.name.toLowerCase() === p.name.toLowerCase()) reasons.push("name match");
        else if (p.name && c.name && c.name.toLowerCase().includes(p.name.toLowerCase())) reasons.push("name similar");
        return { ...c, match_reason: reasons.join(" · ") || "fuzzy" };
      });
      setMatches(enriched);
    } catch (e: any) {
      toast.error(e?.message ?? "Dedupe check failed");
    } finally {
      setChecking(false);
    }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { data, error } = await supabase.from("candidates").insert({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source.trim() || "sourcing",
      notes: form.notes.trim() || null,
      resume_text: form.resume_text.trim() || null,
      skills: splitList(form.skills),
      tags: splitList(form.tags),
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
        candidate_id: data.id,
        type: "candidate_sourced",
        message: `Sourced candidate: ${form.name.trim()}`,
      });
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Candidate added to Talent DB");
    reset();
    loadRecent();
  };

  const mergeInto = async (existing: CandidateMatch) => {
    setSaving(true);
    const mergedSkills = dedupeArr([...(existing.skills || []), ...splitList(form.skills)]);
    const mergedTags = dedupeArr([...(existing.tags || []), ...splitList(form.tags)]);
    const mergedNotes = [existing.notes, form.notes].filter(Boolean).join("\n---\n");
    const { error } = await supabase
      .from("candidates")
      .update({
        email: existing.email || form.email.trim() || null,
        phone: existing.phone || form.phone.trim() || null,
        source: existing.source || form.source.trim() || "sourcing",
        skills: mergedSkills,
        tags: mergedTags,
        notes: mergedNotes || null,
        resume_text: existing.resume_text || form.resume_text.trim() || null,
      })
      .eq("id", existing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await supabase.from("activity_log").insert({
      candidate_id: existing.id,
      type: "candidate_merged",
      message: `Merged sourced profile into ${existing.name}`,
    });
    toast.success(`Merged into ${existing.name}`);
    reset();
    loadRecent();
  };

  const hasStrongMatch = useMemo(
    () => matches.some((m) => m.match_reason.includes("match") && !m.match_reason.includes("similar")),
    [matches]
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sourcing</h1>
          <p className="text-sm text-muted-foreground">
            Paste a LinkedIn bio, GitHub README, portfolio blurb, or recruiter note. AI extracts a clean profile and checks for duplicates before saving.
          </p>
        </div>
        {(profile || rawText) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Clear
          </Button>
        )}
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* INPUT */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Profile text
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={14}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`Examples:\n\n• LinkedIn "About" + Experience section\n• GitHub bio + pinned repo descriptions\n• An email signature with a resume below\n• A note like: "Met Priya Sharma at AWS re:Invent. Senior backend, 8 yrs, Go + Kafka, ex-Stripe. priya@example.com"`}
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{rawText.length.toLocaleString()} chars</p>
              <Button onClick={parseWithAi} disabled={parsing || rawText.trim().length < 30}>
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Parse with AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* EXTRACTED */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Extracted profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!profile && (
              <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-md">
                Paste text on the left and click <span className="font-medium">Parse with AI</span>.
              </div>
            )}
            {profile && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Source</Label>
                    <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="LinkedIn, GitHub…" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Skills (comma-sep)</Label>
                  <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Tags (comma-sep)</Label>
                  <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DEDUPE */}
      {profile && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" /> Duplicate check
              {checking && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!checking && matches.length === 0 && (
              <div className="text-sm text-muted-foreground">No similar candidates found. Safe to save as new.</div>
            )}
            {hasStrongMatch && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>Strong match found — merging is recommended to keep the Talent DB clean.</span>
              </div>
            )}
            <div className="space-y-2">
              {matches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-medium truncate">{m.name}</div>
                      <Badge variant="outline" className="text-[10px]">{m.match_reason}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {[m.email, m.phone, m.source].filter(Boolean).join(" · ") || "—"}
                    </div>
                    {(m.skills?.length ?? 0) > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {m.skills.slice(0, 6).map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => mergeInto(m)} disabled={saving}>
                    <GitMerge className="h-3.5 w-3.5" /> Merge
                  </Button>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-end">
              <Button onClick={saveNew} disabled={saving || !form.name.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Save as new candidate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RECENT */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recently sourced</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-sm text-muted-foreground">No candidates yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {recent.map((c) => (
                <div key={c.id} className="border rounded-md p-3">
                  <div className="font-medium text-sm truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[c.email, c.source].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {(c.skills?.length ?? 0) > 0 && (
                    <div className="flex gap-1 flex-wrap mt-1.5">
                      {c.skills.slice(0, 4).map((s) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

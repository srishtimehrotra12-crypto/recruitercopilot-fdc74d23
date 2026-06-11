import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Users, Plus, Search, Sparkles, Mail, Phone, Tag, ChevronRight, Loader2 } from "lucide-react";

type Candidate = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  notes: string | null;
  resume_text: string | null;
  parsed_json: any;
  skills: string[];
  tags: string[];
  created_at: string;
};

type Job = { id: string; title: string };

type TechQuestion = {
  topic: string;
  difficulty: string;
  category: string;
  question: string;
  tied_to: string;
  signal: string;
  follow_ups?: string[];
};

const splitList = (s: string) =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

export default function Talent() {
  const { user, session } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [skillFilter, setSkillFilter] = useState<string>("");

  // create
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", source: "",
    skills: "", tags: "", notes: "", resume_text: "",
  });
  const [saving, setSaving] = useState(false);

  // detail
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<TechQuestion[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [targetJob, setTargetJob] = useState<string>("");
  const [seniority, setSeniority] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [c, j] = await Promise.all([
      supabase.from("candidates").select("*").order("created_at", { ascending: false }),
      supabase.from("jobs").select("id,title").order("created_at", { ascending: false }),
    ]);
    if (c.error) toast.error(c.error.message);
    setCandidates((c.data ?? []) as Candidate[]);
    setJobs((j.data ?? []) as Job[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [candidates]);

  const allSkills = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach((c) => c.skills?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidates.filter((c) => {
      if (tagFilter && !c.tags?.includes(tagFilter)) return false;
      if (skillFilter && !c.skills?.includes(skillFilter)) return false;
      if (!q) return true;
      const hay = [
        c.name, c.email ?? "", c.phone ?? "", c.source ?? "", c.notes ?? "",
        (c.skills ?? []).join(" "), (c.tags ?? []).join(" "), c.resume_text ?? "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [candidates, query, tagFilter, skillFilter]);

  const createCandidate = async () => {
    if (!user || !form.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("candidates").insert({
      owner_id: user.id,
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source.trim() || "manual",
      notes: form.notes.trim() || null,
      resume_text: form.resume_text.trim() || null,
      skills: splitList(form.skills),
      tags: splitList(form.tags),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Candidate added");
    setOpen(false);
    setForm({ name: "", email: "", phone: "", source: "", skills: "", tags: "", notes: "", resume_text: "" });
    load();
  };

  const openDetail = (c: Candidate) => {
    setSelected(c);
    setQuestions([]);
    setTargetJob("");
    setSeniority("");
  };

  const generateQuestions = async () => {
    if (!selected || !session) return;
    setGenLoading(true);
    setQuestions([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-tech-questions", {
        body: {
          candidateId: selected.id,
          jobId: targetJob || null,
          seniority: seniority || null,
          count: 8,
        },
      });
      if (error) throw error;
      const qs = (data?.questions ?? []) as TechQuestion[];
      if (!qs.length) toast.error("No questions returned");
      setQuestions(qs);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate questions");
    } finally {
      setGenLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Talent Database</h1>
          <p className="text-sm text-muted-foreground">Search every candidate you've sourced across all jobs.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Add candidate</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add candidate</DialogTitle>
              <DialogDescription>Saved to your Talent Database. Add to a pipeline later from the Pipeline page.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Source</Label><Input placeholder="LinkedIn, referral…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
                <div><Label>Tags (comma-sep)</Label><Input placeholder="senior, backend" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              </div>
              <div><Label>Skills (comma-sep)</Label><Input placeholder="React, TypeScript, Postgres" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div>
                <Label>Resume text</Label>
                <Textarea rows={6} placeholder="Paste the resume here so AI can generate tailored questions." value={form.resume_text} onChange={(e) => setForm({ ...form, resume_text: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createCandidate} disabled={saving || !form.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, skill, note…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <Select value={tagFilter || "__all"} onValueChange={(v) => setTagFilter(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All tags</SelectItem>
            {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={skillFilter || "__all"} onValueChange={(v) => setSkillFilter(v === "__all" ? "" : v)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Skill" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">All skills</SelectItem>
            {allSkills.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Users className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">{candidates.length === 0 ? "No candidates yet" : "No matches"}</div>
            <p className="text-sm text-muted-foreground">
              {candidates.length === 0 ? "Add your first candidate to start building your talent pool." : "Try clearing filters or adjusting your search."}
            </p>
            {candidates.length === 0 && (
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add candidate</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => openDetail(c)}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    {c.email && <div className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                {c.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.skills.slice(0, 5).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    {c.skills.length > 5 && <span className="text-xs text-muted-foreground">+{c.skills.length - 5}</span>}
                  </div>
                )}
                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map((t) => <Badge key={t} variant="outline" className="text-xs"><Tag className="h-3 w-3 mr-1" />{t}</Badge>)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.email && <span className="inline-flex items-center gap-1 mr-3"><Mail className="h-3 w-3" />{selected.email}</span>}
                  {selected.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{selected.phone}</span>}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-5">
                {selected.skills?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
                {selected.tags?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
                    </div>
                  </div>
                )}
                {selected.notes && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Notes</div>
                    <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                  </div>
                )}
                {selected.resume_text && (
                  <details className="rounded-md border p-3">
                    <summary className="text-xs font-medium text-muted-foreground cursor-pointer">Resume text</summary>
                    <pre className="mt-2 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">{selected.resume_text}</pre>
                  </details>
                )}

                <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Tailored technical questions</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Generated from this candidate's resume{targetJob ? " against the selected job" : ""}.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={targetJob || "__none"} onValueChange={(v) => setTargetJob(v === "__none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Target job (optional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none">No specific job</SelectItem>
                        {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={seniority || "__any"} onValueChange={(v) => setSeniority(v === "__any" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Seniority" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any">Any seniority</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="mid">Mid</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="staff">Staff / Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={generateQuestions} disabled={genLoading} className="w-full">
                    {genLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate questions</>}
                  </Button>

                  {questions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      {questions.map((q, i) => (
                        <div key={i} className="rounded-md border bg-card p-3 space-y-2">
                          <div className="flex flex-wrap items-center gap-1 text-xs">
                            <Badge variant="outline">{q.category}</Badge>
                            <Badge variant="secondary">{q.difficulty}</Badge>
                            <span className="text-muted-foreground">· {q.topic}</span>
                          </div>
                          <div className="text-sm font-medium">{q.question}</div>
                          {q.tied_to && <div className="text-xs text-muted-foreground"><span className="font-medium">Tied to:</span> {q.tied_to}</div>}
                          {q.signal && <div className="text-xs"><span className="font-medium">Signal:</span> {q.signal}</div>}
                          {q.follow_ups && q.follow_ups.length > 0 && (
                            <div className="text-xs">
                              <div className="font-medium mb-0.5">Follow-ups:</div>
                              <ul className="list-disc ml-5 space-y-0.5 text-muted-foreground">
                                {q.follow_ups.map((f, k) => <li key={k}>{f}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

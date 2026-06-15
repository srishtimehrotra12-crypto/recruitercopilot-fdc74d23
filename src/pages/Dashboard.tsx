import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { SHARED_OWNER_ID } from "@/lib/workspace";
import { toast } from "sonner";
import {
  Activity, ArrowRight, BarChart3, Briefcase, CalendarClock, KanbanSquare,
  Plus, Search, Sparkles, TrendingUp, UserPlus, Users,
} from "lucide-react";

type Stage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
type Job = { id: string; title: string; status: "open" | "paused" | "closed"; location: string | null; created_at: string };
type Candidate = { id: string; name: string; email: string | null; source: string | null; skills: string[]; tags: string[]; created_at: string };
type Application = {
  id: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
  job_id: string;
  candidate_id: string;
  candidate?: { name: string } | null;
  job?: { title: string } | null;
};
type ActivityRow = {
  id: string;
  type: string;
  message: string | null;
  created_at: string;
  candidate?: { name: string } | null;
  job?: { title: string } | null;
};

const STAGES: Stage[] = ["applied", "screening", "interview", "offer", "hired", "rejected"];

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const activityIcon = (type: string) => {
  if (type.includes("job")) return Briefcase;
  if (type.includes("stage")) return KanbanSquare;
  if (type.includes("source") || type.includes("candidate")) return UserPlus;
  return Activity;
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const [jobOpen, setJobOpen] = useState(false);
  const [jobTitle, setJobTitle] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobStatus, setJobStatus] = useState<"open" | "paused" | "closed">("open");

  const [candidateOpen, setCandidateOpen] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: "", email: "", source: "", skills: "", tags: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [j, c, a, log] = await Promise.all([
      supabase.from("jobs").select("id,title,status,location,created_at").order("created_at", { ascending: false }),
      supabase.from("candidates").select("id,name,email,source,skills,tags,created_at").order("created_at", { ascending: false }),
      supabase
        .from("applications")
        .select("id,stage,created_at,updated_at,job_id,candidate_id,candidate:candidates(name),job:jobs(title)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("activity_log")
        .select("id,type,message,created_at,candidate:candidates(name),job:jobs(title)")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    if (j.error) toast.error(j.error.message);
    if (c.error) toast.error(c.error.message);
    if (a.error) toast.error(a.error.message);
    if (log.error) toast.error(log.error.message);
    setJobs((j.data ?? []) as Job[]);
    setCandidates((c.data ?? []) as Candidate[]);
    setApps((a.data ?? []) as unknown as Application[]);
    setActivities((log.data ?? []) as unknown as ActivityRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === "open").length;
    const inPipeline = apps.filter((a) => a.stage !== "hired" && a.stage !== "rejected").length;
    const hires = apps.filter((a) => a.stage === "hired").length;
    const sourcedThisWeek = candidates.filter((c) => {
      const d = new Date(c.created_at);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return d >= cutoff;
    }).length;
    return [
      { label: "Open jobs", value: openJobs, icon: Briefcase, href: "/jobs" },
      { label: "Candidates", value: candidates.length, icon: Users, href: "/talent" },
      { label: "In pipeline", value: inPipeline, icon: KanbanSquare, href: "/pipeline" },
      { label: "Hires", value: hires, icon: TrendingUp, href: "/analytics" },
      { label: "Sourced this week", value: sourcedThisWeek, icon: Search, href: "/sourcing" },
    ];
  }, [apps, candidates, jobs]);

  const stageCounts = useMemo(() => {
    const counts = Object.fromEntries(STAGES.map((stage) => [stage, 0])) as Record<Stage, number>;
    apps.forEach((a) => { counts[a.stage] = (counts[a.stage] ?? 0) + 1; });
    return counts;
  }, [apps]);

  const createJob = async () => {
    if (!jobTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("jobs").insert({
      owner_id: SHARED_OWNER_ID,
      title: jobTitle.trim(),
      description: jobDescription.trim() || null,
      location: jobLocation.trim() || null,
      status: jobStatus,
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
        owner_id: SHARED_OWNER_ID,
        job_id: data.id,
        type: "job_created",
        message: `Created job: ${jobTitle.trim()}`,
      });
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Job created");
    setJobOpen(false);
    setJobTitle(""); setJobLocation(""); setJobDescription(""); setJobStatus("open");
    load();
  };

  const createCandidate = async () => {
    if (!candidateForm.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("candidates").insert({
      owner_id: SHARED_OWNER_ID,
      name: candidateForm.name.trim(),
      email: candidateForm.email.trim() || null,
      source: candidateForm.source.trim() || "manual",
      notes: candidateForm.notes.trim() || null,
      skills: splitList(candidateForm.skills),
      tags: splitList(candidateForm.tags),
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
        owner_id: SHARED_OWNER_ID,
        candidate_id: data.id,
        type: "candidate_created",
        message: `Added candidate: ${candidateForm.name.trim()}`,
      });
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Candidate added");
    setCandidateOpen(false);
    setCandidateForm({ name: "", email: "", source: "", skills: "", tags: "", notes: "" });
    load();
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Recruiting command center</h1>
          <p className="text-sm text-muted-foreground">
            Monitor jobs, candidate movement, sourcing, and recent activity across the workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/sourcing"><Sparkles className="h-4 w-4" /> Source with AI</Link>
          </Button>
          <Dialog open={candidateOpen} onOpenChange={setCandidateOpen}>
            <DialogTrigger asChild><Button variant="outline"><UserPlus className="h-4 w-4" /> Add candidate</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add candidate</DialogTitle>
                <DialogDescription>Create a talent record directly from the dashboard.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={candidateForm.name} onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input value={candidateForm.email} onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })} /></div>
                  <div><Label>Source</Label><Input value={candidateForm.source} onChange={(e) => setCandidateForm({ ...candidateForm, source: e.target.value })} placeholder="Referral, LinkedIn…" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Skills</Label><Input value={candidateForm.skills} onChange={(e) => setCandidateForm({ ...candidateForm, skills: e.target.value })} placeholder="React, Go, AWS" /></div>
                  <div><Label>Tags</Label><Input value={candidateForm.tags} onChange={(e) => setCandidateForm({ ...candidateForm, tags: e.target.value })} placeholder="senior, remote" /></div>
                </div>
                <div><Label>Notes</Label><Textarea rows={3} value={candidateForm.notes} onChange={(e) => setCandidateForm({ ...candidateForm, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCandidateOpen(false)}>Cancel</Button>
                <Button onClick={createCandidate} disabled={saving || !candidateForm.name.trim()}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> New job</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create job</DialogTitle>
                <DialogDescription>Add a new role and start building the pipeline.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Title *</Label><Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Senior Backend Engineer" /></div>
                <div><Label>Location</Label><Input value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} placeholder="Remote · London" /></div>
                <div><Label>Description</Label><Textarea rows={4} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} /></div>
                <div>
                  <Label>Status</Label>
                  <Select value={jobStatus} onValueChange={(v: "open" | "paused" | "closed") => setJobStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setJobOpen(false)}>Cancel</Button>
                <Button onClick={createJob} disabled={saving || !jobTitle.trim()}>{saving ? "Creating…" : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Link to={s.href} key={s.label}>
            <Card className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-semibold leading-none">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
            <CardDescription>Run AI screening on a batch of resumes against a job description.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/screening">
                Start a screening <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coming next</CardTitle>
            <CardDescription>
              Jobs, ATS Pipeline, Talent Database, Sourcing, Analytics — rolling out in upcoming phases.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

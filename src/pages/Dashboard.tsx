import { useEffect, useMemo, useRef, useState } from "react";
import { extractTextFromFile, getFileKind, ACCEPTED_FILE_EXTS } from "@/lib/fileParser";
import { useUserRole } from "@/hooks/useUserRole";
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
      title: jobTitle.trim(),
      description: jobDescription.trim() || null,
      location: jobLocation.trim() || null,
      status: jobStatus,
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
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
      name: candidateForm.name.trim(),
      email: candidateForm.email.trim() || null,
      source: candidateForm.source.trim() || "manual",
      notes: candidateForm.notes.trim() || null,
      skills: splitList(candidateForm.skills),
      tags: splitList(candidateForm.tags),
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
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

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KanbanSquare className="h-4 w-4 text-primary" /> Pipeline snapshot
            </CardTitle>
            <CardDescription>Current candidate distribution by hiring stage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {STAGES.map((stage) => (
                <div key={stage} className="rounded-md border p-3">
                  <div className="text-2xl font-semibold leading-none">{stageCounts[stage]}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">{stage}</div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent movement</h2>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/pipeline">Open pipeline <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              {apps.slice(0, 5).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No pipeline activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {apps.slice(0, 5).map((app) => (
                    <div key={app.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{app.candidate?.name ?? "Candidate"}</div>
                        <div className="text-xs text-muted-foreground truncate">{app.job?.title ?? "Job"}</div>
                      </div>
                      <Badge variant={app.stage === "hired" ? "default" : app.stage === "rejected" ? "destructive" : "secondary"} className="capitalize">
                        {app.stage}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity feed
            </CardTitle>
            <CardDescription>Latest workspace updates.</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">New jobs, candidates, merges, and stage changes will appear here.</p>
            ) : (
              <div className="space-y-3">
                {activities.map((item) => {
                  const Icon = activityIcon(item.type);
                  return (
                    <div key={item.id} className="flex gap-3">
                      <div className="mt-0.5 h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium leading-snug">{item.message || item.type.split("_").join(" ")}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <CalendarClock className="h-3 w-3" /> {formatDateTime(item.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> Active jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.slice(0, 5).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 5).map((job) => (
                  <div key={job.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{job.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{job.location || "No location set"}</div>
                    </div>
                    <Badge variant={job.status === "open" ? "default" : "secondary"} className="capitalize">{job.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Quick actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" asChild className="justify-start">
              <Link to="/analytics"><BarChart3 className="h-4 w-4" /> View analytics</Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/screening"><Sparkles className="h-4 w-4" /> Run AI screening</Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/talent"><Users className="h-4 w-4" /> Search talent DB</Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link to="/sourcing"><Search className="h-4 w-4" /> Source candidates</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

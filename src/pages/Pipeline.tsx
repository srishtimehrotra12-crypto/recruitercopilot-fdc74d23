import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { KanbanSquare, Plus, UserPlus, GripVertical } from "lucide-react";

type Stage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
const STAGES: { id: Stage; label: string }[] = [
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "hired", label: "Hired" },
  { id: "rejected", label: "Rejected" },
];

type Job = { id: string; title: string };
type Candidate = { id: string; name: string; email: string | null };
type Application = {
  id: string;
  candidate_id: string;
  stage: Stage;
  score: number | null;
  candidate: Candidate;
};

function DraggableCard({ app }: { app: Application }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: app.id });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`rounded-md border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{app.candidate.name}</div>
          {app.candidate.email && (
            <div className="text-xs text-muted-foreground truncate">{app.candidate.email}</div>
          )}
          {app.score != null && (
            <Badge variant="secondary" className="mt-2 text-xs">Score {app.score}</Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function Column({ stage, label, apps }: { stage: Stage; label: string; apps: Application[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[220px] rounded-lg border bg-muted/30 p-3 space-y-3 transition-colors ${
        isOver ? "bg-muted/70 border-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="secondary">{apps.length}</Badge>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {apps.map((a) => <DraggableCard key={a.id} app={a} />)}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>("");
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  // add candidate dialog
  const [addOpen, setAddOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cNotes, setCNotes] = useState("");
  const [cStage, setCStage] = useState<Stage>("applied");
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("jobs").select("id,title").order("created_at", { ascending: false });
      const list = (data ?? []) as Job[];
      setJobs(list);
      const requested = params.get("job");
      const initial = requested && list.some((j) => j.id === requested) ? requested : list[0]?.id ?? "";
      setJobId(initial);
      if (!initial) setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!jobId) { setApps([]); return; }
    setLoading(true);
    setParams((p) => { const n = new URLSearchParams(p); n.set("job", jobId); return n; }, { replace: true });
    supabase
      .from("applications")
      .select("id, candidate_id, stage, score, candidate:candidates(id,name,email)")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setApps((data ?? []) as any);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const byStage = useMemo(() => {
    const m: Record<Stage, Application[]> = {
      applied: [], screening: [], interview: [], offer: [], hired: [], rejected: [],
    };
    apps.forEach((a) => m[a.stage].push(a));
    return m;
  }, [apps]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id as Stage | undefined;
    if (!overId) return;
    const appId = String(e.active.id);
    const app = apps.find((a) => a.id === appId);
    if (!app || app.stage === overId) return;
    const prev = app.stage;
    setApps((cur) => cur.map((a) => (a.id === appId ? { ...a, stage: overId } : a)));
    const { error } = await supabase.from("applications").update({ stage: overId }).eq("id", appId);
    if (error) {
      toast.error(error.message);
      setApps((cur) => cur.map((a) => (a.id === appId ? { ...a, stage: prev } : a)));
      return;
    }
    if (user) {
      await supabase.from("activity_log").insert({
        owner_id: user.id,
        application_id: appId,
        candidate_id: app.candidate_id,
        job_id: jobId,
        type: "stage_change",
        message: `Moved from ${prev} to ${overId}`,
      });
    }
    toast.success(`Moved to ${overId}`);
  };

  const addCandidate = async () => {
    if (!user || !jobId || !cName.trim()) return;
    setSaving(true);
    const { data: cand, error: e1 } = await supabase
      .from("candidates")
      .insert({
        owner_id: user.id,
        name: cName.trim(),
        email: cEmail.trim() || null,
        phone: cPhone.trim() || null,
        notes: cNotes.trim() || null,
        source: "manual",
      })
      .select("id,name,email")
      .single();
    if (e1 || !cand) { setSaving(false); return toast.error(e1?.message ?? "Failed"); }
    const { data: appRow, error: e2 } = await supabase
      .from("applications")
      .insert({
        owner_id: user.id,
        job_id: jobId,
        candidate_id: cand.id,
        stage: cStage,
      })
      .select("id, candidate_id, stage, score")
      .single();
    setSaving(false);
    if (e2 || !appRow) return toast.error(e2?.message ?? "Failed");
    setApps((cur) => [...cur, { ...(appRow as any), candidate: cand }]);
    setAddOpen(false);
    setCName(""); setCEmail(""); setCPhone(""); setCNotes(""); setCStage("applied");
    toast.success("Candidate added");
  };

  const activeApp = activeId ? apps.find((a) => a.id === activeId) : null;

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ATS Pipeline</h1>
          <p className="text-sm text-muted-foreground">Drag candidates across stages.</p>
        </div>
        <div className="flex items-center gap-2">
          {jobs.length > 0 && (
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="Select a job" /></SelectTrigger>
              <SelectContent>
                {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={!jobId}><UserPlus className="h-4 w-4" /> Add candidate</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add candidate to pipeline</DialogTitle>
                <DialogDescription>Creates a candidate and adds them to this job.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Name *</Label><Input value={cName} onChange={(e) => setCName(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={cEmail} onChange={(e) => setCEmail(e.target.value)} /></div>
                  <div><Label>Phone</Label><Input value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={cNotes} onChange={(e) => setCNotes(e.target.value)} rows={3} /></div>
                <div>
                  <Label>Stage</Label>
                  <Select value={cStage} onValueChange={(v: any) => setCStage(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
                <Button onClick={addCandidate} disabled={saving || !cName.trim()}>
                  {saving ? "Adding…" : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <KanbanSquare className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">No jobs yet</div>
            <p className="text-sm text-muted-foreground">Create a job first to build a pipeline.</p>
            <Button asChild><a href="/jobs"><Plus className="h-4 w-4" /> Create job</a></Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4">
            {STAGES.map((s) => (
              <Column key={s.id} stage={s.id} label={s.label} apps={byStage[s.id]} />
            ))}
          </div>
          <DragOverlay>
            {activeApp ? <DraggableCard app={activeApp} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

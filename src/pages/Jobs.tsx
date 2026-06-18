import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Plus, KanbanSquare } from "lucide-react";

type Job = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: "open" | "paused" | "closed";
  created_at: string;
};

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"open" | "paused" | "closed">("open");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setJobs((data ?? []) as Job[]);
      const ids = (data ?? []).map((j) => j.id);
      if (ids.length) {
        const { data: apps } = await supabase
          .from("applications")
          .select("job_id")
          .in("job_id", ids);
        const c: Record<string, number> = {};
        (apps ?? []).forEach((a: any) => (c[a.job_id] = (c[a.job_id] ?? 0) + 1));
        setCounts(c);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createJob = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from("jobs").insert({
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      status,
    }).select("id").single();
    if (!error && data) {
      await supabase.from("activity_log").insert({
        job_id: data.id,
        type: "job_created",
        message: `Created job: ${title.trim()}`,
      });
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Job created");
    setOpen(false);
    setTitle(""); setDescription(""); setLocation(""); setStatus("open");
    load();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
          <p className="text-sm text-muted-foreground">Create and manage your open roles.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> New job</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create job</DialogTitle>
              <DialogDescription>Add a new role to start tracking candidates.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="t">Title *</Label>
                <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" />
              </div>
              <div>
                <Label htmlFor="l">Location</Label>
                <Input id="l" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote · Berlin" />
              </div>
              <div>
                <Label htmlFor="d">Description</Label>
                <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
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
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={createJob} disabled={saving || !title.trim()}>
                {saving ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground" />
            <div className="font-medium">No jobs yet</div>
            <p className="text-sm text-muted-foreground">Create your first role to start building a pipeline.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New job</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <Card key={j.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{j.title}</CardTitle>
                  <Badge variant={j.status === "open" ? "default" : "secondary"}>{j.status}</Badge>
                </div>
                {j.location && <p className="text-xs text-muted-foreground">{j.location}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                {j.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{j.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {counts[j.id] ?? 0} candidate{(counts[j.id] ?? 0) === 1 ? "" : "s"}
                  </span>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/pipeline?job=${j.id}`}>
                      <KanbanSquare className="h-4 w-4" /> Pipeline
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

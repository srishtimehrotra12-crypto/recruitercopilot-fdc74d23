import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Clock, Target, TrendingUp, Users } from "lucide-react";

type Stage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";

const STAGE_ORDER: Stage[] = ["applied", "screening", "interview", "offer", "hired"];
const STAGE_COLORS: Record<Stage, string> = {
  applied: "hsl(var(--chart-1, 217 91% 60%))",
  screening: "hsl(var(--chart-2, 262 83% 58%))",
  interview: "hsl(var(--chart-3, 24 95% 53%))",
  offer: "hsl(var(--chart-4, 142 71% 45%))",
  hired: "hsl(var(--chart-5, 173 80% 40%))",
  rejected: "hsl(0 84% 60%)",
};

type AppRow = {
  id: string;
  job_id: string;
  candidate_id: string;
  stage: Stage;
  created_at: string;
  updated_at: string;
};
type JobRow = { id: string; title: string; status: string; created_at: string };
type CandRow = { id: string; source: string | null; created_at: string };

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [cands, setCands] = useState<CandRow[]>([]);
  const [jobFilter, setJobFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, j, c] = await Promise.all([
        supabase.from("applications").select("id,job_id,candidate_id,stage,created_at,updated_at"),
        supabase.from("jobs").select("id,title,status,created_at"),
        supabase.from("candidates").select("id,source,created_at"),
      ]);
      setApps((a.data as AppRow[]) || []);
      setJobs((j.data as JobRow[]) || []);
      setCands((c.data as CandRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const filteredApps = useMemo(
    () => (jobFilter === "all" ? apps : apps.filter((a) => a.job_id === jobFilter)),
    [apps, jobFilter],
  );

  const funnel = useMemo(() => {
    const counts: Record<Stage, number> = {
      applied: 0, screening: 0, interview: 0, offer: 0, hired: 0, rejected: 0,
    };
    for (const a of filteredApps) counts[a.stage] = (counts[a.stage] || 0) + 1;
    // Cumulative reaching at-or-past each stage
    const reachedBy: Record<Stage, number> = {
      applied: filteredApps.length,
      screening: 0, interview: 0, offer: 0, hired: 0, rejected: counts.rejected,
    };
    const idx = (s: Stage) => STAGE_ORDER.indexOf(s);
    for (const a of filteredApps) {
      const i = idx(a.stage);
      if (i < 0) continue;
      for (let k = 1; k <= i; k++) reachedBy[STAGE_ORDER[k]] += 1;
    }
    return STAGE_ORDER.map((s, i) => {
      const reached = reachedBy[s];
      const prev = i === 0 ? reached : reachedBy[STAGE_ORDER[i - 1]];
      const conv = prev > 0 ? Math.round((reached / prev) * 100) : 0;
      const overall = reachedBy.applied > 0 ? Math.round((reached / reachedBy.applied) * 100) : 0;
      return { stage: s, count: reached, conv, overall, fill: STAGE_COLORS[s] };
    });
  }, [filteredApps]);

  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of cands) {
      const key = (c.source || "unknown").toLowerCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [cands]);

  const timeline = useMemo(() => {
    // Last 30 days, applications created per day
    const days = 30;
    const buckets: { date: string; applied: number; hired: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.push({
        date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        applied: 0,
        hired: 0,
      });
    }
    const start = new Date(today);
    start.setDate(start.getDate() - (days - 1));
    for (const a of filteredApps) {
      const dt = new Date(a.created_at);
      if (dt < start) continue;
      const diff = Math.floor((dt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) buckets[diff].applied += 1;
      if (a.stage === "hired") {
        const dt2 = new Date(a.updated_at);
        const diff2 = Math.floor((dt2.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diff2 >= 0 && diff2 < days) buckets[diff2].hired += 1;
      }
    }
    return buckets;
  }, [filteredApps]);

  const kpis = useMemo(() => {
    const total = filteredApps.length;
    const hired = filteredApps.filter((a) => a.stage === "hired").length;
    const inFlight = filteredApps.filter(
      (a) => a.stage !== "hired" && a.stage !== "rejected",
    ).length;
    // Avg time-to-hire = updated_at - created_at for hired apps
    const hiredApps = filteredApps.filter((a) => a.stage === "hired");
    const avgDays =
      hiredApps.length > 0
        ? Math.round(
            hiredApps.reduce(
              (s, a) =>
                s +
                (new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) /
                  (1000 * 60 * 60 * 24),
              0,
            ) / hiredApps.length,
          )
        : 0;
    const rate = total > 0 ? Math.round((hired / total) * 100) : 0;
    return { total, hired, inFlight, avgDays, rate };
  }, [filteredApps]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const hasData = apps.length > 0 || cands.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Funnel, conversion, time-to-hire, and source effectiveness.
          </p>
        </div>
        <Select value={jobFilter} onValueChange={setJobFilter}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {jobs.map((j) => (
              <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!hasData && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No data yet. Create jobs, add candidates, and move applications through the pipeline to populate analytics.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi icon={<Users className="h-4 w-4" />} label="Total applications" value={kpis.total} />
        <Kpi icon={<TrendingUp className="h-4 w-4" />} label="In flight" value={kpis.inFlight} />
        <Kpi icon={<Target className="h-4 w-4" />} label="Hires" value={kpis.hired} suffix={kpis.total ? `${kpis.rate}%` : ""} />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Avg time-to-hire" value={kpis.avgDays} suffix="days" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversion funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnel.map((f, i) => {
              const max = funnel[0].count || 1;
              const widthPct = Math.max(4, Math.round((f.count / max) * 100));
              return (
                <div key={f.stage} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{f.stage}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{f.count}</span>
                      {i > 0 && <Badge variant="secondary">{f.conv}% step</Badge>}
                      <Badge variant="outline">{f.overall}% overall</Badge>
                    </div>
                  </div>
                  <div className="h-8 rounded-md bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: f.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={4} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="applied" stroke={STAGE_COLORS.applied} strokeWidth={2} />
                <Line type="monotone" dataKey="hired" stroke={STAGE_COLORS.hired} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Source effectiveness</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {sourceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No candidate sources tracked yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="source" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={Object.values(STAGE_COLORS)[i % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  icon, label, value, suffix,
}: { icon: React.ReactNode; label: string; value: number | string; suffix?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
          {icon}
          {label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-3xl font-bold">{value}</div>
          {suffix && <div className="text-sm text-muted-foreground">{suffix}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

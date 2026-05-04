import { useMemo, useState } from "react";
import { Target, CheckCircle2, XCircle, TrendingUp, Sparkles, Filter, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CandidateReport, SkillMatch } from "@/types/reports";

interface MatchBreakdownProps {
  reports: CandidateReport[];
}

type VerdictKey = "strong-hire" | "hire" | "maybe" | "pass";

const VERDICT_OPTIONS: { key: VerdictKey; label: string; match: (v: string) => boolean; activeClass: string }[] = [
  {
    key: "strong-hire",
    label: "Strong Hire",
    match: (v) => v.includes("strong hire"),
    activeClass: "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600",
  },
  {
    key: "hire",
    label: "Hire",
    match: (v) => v.includes("hire") && !v.includes("strong hire") && !v.includes("no hire"),
    activeClass: "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
  },
  {
    key: "maybe",
    label: "Maybe",
    match: (v) => v.includes("maybe"),
    activeClass: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600",
  },
  {
    key: "pass",
    label: "Pass",
    match: (v) => v.includes("pass") || v.includes("no hire"),
    activeClass: "bg-red-500 text-white border-red-500 hover:bg-red-600",
  },
];

const matchesVerdict = (verdict: string, selected: Set<VerdictKey>): boolean => {
  if (selected.size === 0) return true;
  const v = verdict.toLowerCase();
  for (const opt of VERDICT_OPTIONS) {
    if (selected.has(opt.key) && opt.match(v)) return true;
  }
  return false;
};

const scoreTone = (score: number) => {
  if (score >= 85) return { text: "text-emerald-600", bg: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200", ring: "ring-emerald-500/20" };
  if (score >= 65) return { text: "text-sky-600", bg: "bg-sky-500", soft: "bg-sky-50 border-sky-200", ring: "ring-sky-500/20" };
  if (score >= 45) return { text: "text-amber-600", bg: "bg-amber-500", soft: "bg-amber-50 border-amber-200", ring: "ring-amber-500/20" };
  return { text: "text-red-600", bg: "bg-red-500", soft: "bg-red-50 border-red-200", ring: "ring-red-500/20" };
};

const verdictStyle = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500 text-white";
  if (v.includes("hire")) return "bg-primary text-primary-foreground";
  if (v.includes("maybe")) return "bg-amber-500 text-white";
  if (v.includes("pass") || v.includes("no hire")) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
};

// Build a 2-line fit summary from the report
const buildFitSummary = (report: CandidateReport): string => {
  const exec = report.intelligenceReport.executiveSummary?.trim();
  if (exec) {
    // Pick first 2 sentences
    const sentences = exec.match(/[^.!?]+[.!?]+/g) || [exec];
    return sentences.slice(0, 2).join(" ").trim();
  }
  return report.intelligenceReport.overallVerdict || "No summary available.";
};

export function MatchBreakdown({ reports }: MatchBreakdownProps) {
  const [minScore, setMinScore] = useState(0);
  const [selectedVerdicts, setSelectedVerdicts] = useState<Set<VerdictKey>>(new Set());

  const sorted = useMemo(
    () => [...(reports || [])].sort((a, b) => b.score - a.score),
    [reports]
  );

  const filtered = useMemo(
    () => sorted.filter((r) => r.score >= minScore && matchesVerdict(r.verdict, selectedVerdicts)),
    [sorted, minScore, selectedVerdicts]
  );

  if (!reports || reports.length === 0) return null;

  const toggleVerdict = (key: VerdictKey) => {
    setSelectedVerdicts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetFilters = () => {
    setMinScore(0);
    setSelectedVerdicts(new Set());
  };

  const hasActiveFilters = minScore > 0 || selectedVerdicts.size > 0;

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Match Breakdown
        </h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {filtered.length} of {reports.length} candidate{reports.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Filters */}
      <div className="bg-secondary/40 border border-border/60 rounded-lg p-4 mb-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="w-4 h-4 text-primary" />
            Filters
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Min score slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Minimum Score
              </label>
              <span className="text-sm font-bold text-primary tabular-nums">{minScore}</span>
            </div>
            <Slider
              value={[minScore]}
              onValueChange={(v) => setMinScore(v[0])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Verdict chips */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Verdict
            </label>
            <div className="flex flex-wrap gap-1.5">
              {VERDICT_OPTIONS.map((opt) => {
                const active = selectedVerdicts.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleVerdict(opt.key)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? opt.activeClass
                        : "bg-background border-border text-foreground hover:bg-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">
            No candidates match your filters.
          </p>
          <Button variant="link" size="sm" onClick={resetFilters} className="mt-1">
            Clear filters
          </Button>
        </div>
      ) : (
      <div className="space-y-4">
        {filtered.map((report, idx) => {
          const tone = scoreTone(report.score);
          const matched = report.intelligenceReport.skillsMatch.filter(
            (s) => s.rating === "Strong" || s.rating === "Adequate"
          );
          const missing = report.intelligenceReport.skillsMatch.filter(
            (s) => s.rating === "Weak" || s.rating === "Missing"
          );
          const summary = buildFitSummary(report);
          const isTop = idx === 0;

          return (
            <div
              key={`${report.name}-${idx}`}
              className={`relative bg-background border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-md ${
                isTop ? `ring-2 ${tone.ring}` : ""
              }`}
            >
              <div className={`h-1 w-full ${tone.bg}`} />

              <div className="p-5 space-y-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                      {isTop ? <Sparkles className="w-5 h-5" /> : report.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground truncate">{report.name}</h4>
                        {isTop && (
                          <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Top Pick
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${verdictStyle(
                          report.verdict
                        )}`}
                      >
                        {report.verdict}
                      </span>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${tone.soft}`}>
                    <TrendingUp className={`w-4 h-4 ${tone.text}`} />
                    <div className="text-right">
                      <div className={`text-2xl font-bold leading-none ${tone.text}`}>
                        {report.score}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                        / 100
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tone.bg} transition-all duration-700 rounded-full`}
                    style={{ width: `${report.score}%` }}
                  />
                </div>

                {/* 2-line fit summary */}
                <div className="bg-secondary/40 border border-border/50 rounded-lg p-3">
                  <p className="text-sm text-foreground/90 leading-relaxed line-clamp-3">
                    {summary}
                  </p>
                </div>

                {/* Matched & Missing skills */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                          Matched Skills
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {matched.length}
                      </span>
                    </div>
                    {matched.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {matched.map((s, i) => (
                          <span
                            key={i}
                            className="text-xs bg-white border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full"
                            title={s.evidence}
                          >
                            {s.skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No clearly matched skills</p>
                    )}
                  </div>

                  <div className="bg-red-50/40 border border-red-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                          Missing / Weak
                        </span>
                      </div>
                      <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                        {missing.length}
                      </span>
                    </div>
                    {missing.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {missing.map((s, i) => (
                          <span
                            key={i}
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              s.rating === "Missing"
                                ? "bg-white border-red-200 text-red-800"
                                : "bg-white border-amber-200 text-amber-800"
                            }`}
                            title={s.evidence}
                          >
                            {s.skill}
                            {s.required && <span className="ml-1 font-bold">*</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No major gaps</p>
                    )}
                  </div>
                </div>

                {missing.some((s) => s.required) && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-bold">*</span> indicates a required skill
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

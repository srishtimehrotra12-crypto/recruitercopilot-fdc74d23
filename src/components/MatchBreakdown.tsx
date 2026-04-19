import { Target, CheckCircle2, XCircle, TrendingUp, Sparkles } from "lucide-react";
import type { CandidateReport } from "@/types/reports";

interface MatchBreakdownProps {
  reports: CandidateReport[];
}

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
  if (!reports || reports.length === 0) return null;

  const sorted = [...reports].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Match Breakdown
        </h3>
        <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {reports.length} candidate{reports.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-4">
        {sorted.map((report, idx) => {
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
    </div>
  );
}

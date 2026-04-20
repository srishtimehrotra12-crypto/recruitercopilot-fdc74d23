import { Users, Crown, CheckCircle2, AlertCircle, MinusCircle, XCircle, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CandidateReport } from "@/types/reports";

interface CandidateComparisonProps {
  reports: CandidateReport[];
}

const ratingMeta: Record<string, { className: string; icon: React.ReactNode; label: string; dot: string }> = {
  Strong: {
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Strong",
    dot: "bg-emerald-500",
  },
  Adequate: {
    className: "bg-sky-100 text-sky-800 border-sky-300",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Adequate",
    dot: "bg-sky-500",
  },
  Weak: {
    className: "bg-amber-100 text-amber-800 border-amber-300",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Weak",
    dot: "bg-amber-500",
  },
  Missing: {
    className: "bg-red-100 text-red-800 border-red-300",
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Missing",
    dot: "bg-red-500",
  },
};

const verdictBg = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500 text-white border-emerald-600";
  if (v.includes("hire")) return "bg-primary text-primary-foreground border-primary";
  if (v.includes("maybe")) return "bg-amber-500 text-white border-amber-600";
  return "bg-destructive text-destructive-foreground border-destructive";
};

const scoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-600";
  if (score >= 65) return "text-sky-600";
  if (score >= 45) return "text-amber-600";
  return "text-red-600";
};

const scoreBarColor = (score: number) => {
  if (score >= 85) return "bg-emerald-500";
  if (score >= 65) return "bg-sky-500";
  if (score >= 45) return "bg-amber-500";
  return "bg-red-500";
};

const confidenceColor = (level?: string) => {
  switch (level) {
    case "High":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Medium":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Low":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export function CandidateComparison({ reports }: CandidateComparisonProps) {
  if (reports.length < 2) return null;

  // Collect all unique skills across candidates (preserve first-seen order)
  const skillOrder: string[] = [];
  const seen = new Set<string>();
  reports.forEach((r) =>
    r.intelligenceReport?.skillsMatch?.forEach((s) => {
      if (!seen.has(s.skill)) {
        seen.add(s.skill);
        skillOrder.push(s.skill);
      }
    })
  );

  const topScore = Math.max(...reports.map((r) => r.score));
  const topIndex = reports.findIndex((r) => r.score === topScore);

  return (
    <div className="bg-card border-2 border-border rounded-xl card-shadow animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4 border-b-2 border-border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Candidate Comparison
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Side-by-side view of {reports.length} candidates across overall fit and required skills.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/60 border-b-2 border-border">
              <th className="text-left p-4 text-xs font-bold uppercase tracking-wider text-muted-foreground border-r-2 border-border min-w-[200px] sticky left-0 bg-muted/60 z-10">
                Criteria
              </th>
              {reports.map((r, i) => (
                <th
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 min-w-[160px] ${
                    i === topIndex ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                          i === topIndex
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-sm text-foreground">{r.name}</span>
                    </div>
                    {i === topIndex && (
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-[10px] px-2 py-0.5 shadow-sm">
                        <Crown className="w-3 h-3" />
                        Top Pick
                      </Badge>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Section: Overview */}
            <tr className="bg-primary/5">
              <td
                colSpan={reports.length + 1}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary border-y-2 border-primary/20"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5" />
                  Overview
                </div>
              </td>
            </tr>

            {/* Match Score with bar */}
            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="p-4 text-sm font-semibold text-foreground border-r-2 border-border bg-muted/20 sticky left-0 z-10">
                Match Score
              </td>
              {reports.map((r, i) => (
                <td
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 text-center ${
                    i === topIndex ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-3xl font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                      <span className="text-muted-foreground text-xs">/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${scoreBarColor(r.score)}`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            <tr className="border-b border-border bg-muted/10 hover:bg-muted/30 transition-colors">
              <td className="p-4 text-sm font-semibold text-foreground border-r-2 border-border bg-muted/20 sticky left-0 z-10">
                Verdict
              </td>
              {reports.map((r, i) => (
                <td
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 text-center ${
                    i === topIndex ? "bg-primary/5" : ""
                  }`}
                >
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${verdictBg(
                      r.verdict
                    )}`}
                  >
                    {r.verdict}
                  </span>
                </td>
              ))}
            </tr>

            <tr className="border-b border-border hover:bg-muted/30 transition-colors">
              <td className="p-4 text-sm font-semibold text-foreground border-r-2 border-border bg-muted/20 sticky left-0 z-10">
                Confidence
              </td>
              {reports.map((r, i) => (
                <td
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 text-center ${
                    i === topIndex ? "bg-primary/5" : ""
                  }`}
                >
                  <Badge
                    variant="outline"
                    className={`text-xs font-semibold ${confidenceColor(r.intelligenceReport?.confidenceLevel)}`}
                  >
                    {r.intelligenceReport?.confidenceLevel || "N/A"}
                  </Badge>
                </td>
              ))}
            </tr>

            <tr className="border-b border-border bg-muted/10 hover:bg-muted/30 transition-colors">
              <td className="p-4 text-sm font-semibold text-foreground border-r-2 border-border bg-muted/20 sticky left-0 z-10">
                Experience
              </td>
              {reports.map((r, i) => (
                <td
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 text-center text-sm text-foreground ${
                    i === topIndex ? "bg-primary/5" : ""
                  }`}
                >
                  {r.intelligenceReport?.candidateSnapshot?.yearsOfExperience || "—"}
                </td>
              ))}
            </tr>

            <tr className="border-b-2 border-border hover:bg-muted/30 transition-colors">
              <td className="p-4 text-sm font-semibold text-foreground border-r-2 border-border bg-muted/20 sticky left-0 z-10">
                Seniority
              </td>
              {reports.map((r, i) => (
                <td
                  key={i}
                  className={`p-4 border-r border-border last:border-r-0 text-center text-sm text-foreground ${
                    i === topIndex ? "bg-primary/5" : ""
                  }`}
                >
                  {r.intelligenceReport?.candidateSnapshot?.seniority || "—"}
                </td>
              ))}
            </tr>

            {/* Section: Skills */}
            {skillOrder.length > 0 && (
              <>
                <tr className="bg-accent/10">
                  <td
                    colSpan={reports.length + 1}
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-accent-foreground border-y-2 border-accent/30"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Skills ({skillOrder.length})
                    </div>
                  </td>
                </tr>

                {skillOrder.map((skill, si) => (
                  <tr
                    key={skill}
                    className={`border-b border-border hover:bg-muted/30 transition-colors ${
                      si % 2 === 1 ? "bg-muted/10" : ""
                    }`}
                  >
                    <td className={`p-4 text-sm font-medium text-foreground border-r-2 border-border sticky left-0 z-10 ${
                      si % 2 === 1 ? "bg-muted/30" : "bg-muted/20"
                    }`}>
                      {skill}
                    </td>
                    {reports.map((r, i) => {
                      const match = r.intelligenceReport?.skillsMatch?.find(
                        (s) => s.skill === skill
                      );
                      return (
                        <td
                          key={i}
                          className={`p-4 border-r border-border last:border-r-0 text-center ${
                            i === topIndex ? "bg-primary/5" : ""
                          }`}
                        >
                          {!match ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MinusCircle className="w-3.5 h-3.5" />
                              Not assessed
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`gap-1 text-xs font-semibold border ${ratingMeta[match.rating]?.className || ""}`}
                            >
                              {ratingMeta[match.rating]?.icon}
                              {ratingMeta[match.rating]?.label || match.rating}
                            </Badge>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 border-t-2 border-border bg-muted/40 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground font-bold uppercase tracking-wide">Skill ratings:</span>
        {(["Strong", "Adequate", "Weak", "Missing"] as const).map((r) => {
          const meta = ratingMeta[r];
          return (
            <Badge key={r} variant="outline" className={`gap-1 border font-semibold ${meta.className}`}>
              {meta.icon}
              {meta.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

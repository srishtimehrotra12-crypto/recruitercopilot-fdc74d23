import { Users, Crown, CheckCircle2, AlertCircle, MinusCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CandidateReport } from "@/types/reports";

interface CandidateComparisonProps {
  reports: CandidateReport[];
}

const ratingMeta: Record<string, { className: string; icon: React.ReactNode; label: string }> = {
  Strong: {
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Strong",
  },
  Adequate: {
    className: "bg-sky-50 text-sky-700 border-sky-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "Adequate",
  },
  Weak: {
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Weak",
  },
  Missing: {
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
    label: "Missing",
  },
};

const verdictBg = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500 text-white";
  if (v.includes("hire")) return "bg-primary text-primary-foreground";
  if (v.includes("maybe")) return "bg-amber-500 text-white";
  return "bg-destructive text-destructive-foreground";
};

const scoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-600";
  if (score >= 65) return "text-sky-600";
  if (score >= 45) return "text-amber-600";
  return "text-red-600";
};

const confidenceColor = (level?: string) => {
  switch (level) {
    case "High":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Low":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-muted text-muted-foreground";
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

  const colWidth = `minmax(140px, 1fr)`;
  const gridTemplate = `220px repeat(${reports.length}, ${colWidth})`;

  const HeaderRow = () => (
    <div
      className="grid sticky top-0 z-10 bg-card border-b-2 border-border"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="p-3 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Criteria
      </div>
      {reports.map((r, i) => (
        <div
          key={i}
          className={`p-3 border-l border-border flex flex-col items-center gap-1.5 ${
            i === topIndex ? "bg-primary/5" : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs ${
                i === topIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {r.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm text-foreground text-center">{r.name}</span>
          </div>
          {i === topIndex && (
            <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1 text-[10px] px-2 py-0">
              <Crown className="w-3 h-3" />
              Top Pick
            </Badge>
          )}
        </div>
      ))}
    </div>
  );

  const SectionHeader = ({ label }: { label: string }) => (
    <div
      className="grid bg-muted/50 border-b border-border"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground col-span-full">
        {label}
      </div>
    </div>
  );

  const Row = ({
    label,
    children,
    striped = false,
  }: {
    label: string;
    children: (report: CandidateReport, index: number) => React.ReactNode;
    striped?: boolean;
  }) => (
    <div
      className={`grid border-b border-border/60 ${striped ? "bg-muted/20" : ""}`}
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="p-3 text-sm font-medium text-foreground flex items-center">{label}</div>
      {reports.map((r, i) => (
        <div
          key={i}
          className={`p-3 border-l border-border/60 flex items-center justify-center text-center ${
            i === topIndex ? "bg-primary/5" : ""
          }`}
        >
          {children(r, i)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl card-shadow animate-fade-in overflow-hidden">
      <div className="p-6 pb-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Candidate Comparison
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Side-by-side view of {reports.length} candidates across overall fit and required skills.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full">
          <HeaderRow />

          {/* Overview section */}
          <SectionHeader label="Overview" />
          <Row label="Match Score">
            {(r) => (
              <div className="flex items-baseline gap-0.5">
                <span className={`text-2xl font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                <span className="text-muted-foreground text-xs">/100</span>
              </div>
            )}
          </Row>
          <Row label="Verdict" striped>
            {(r) => (
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${verdictBg(
                  r.verdict
                )}`}
              >
                {r.verdict}
              </span>
            )}
          </Row>
          <Row label="Confidence">
            {(r) => (
              <Badge
                variant="outline"
                className={`text-xs ${confidenceColor(r.intelligenceReport?.confidenceLevel)}`}
              >
                {r.intelligenceReport?.confidenceLevel || "N/A"}
              </Badge>
            )}
          </Row>
          <Row label="Experience" striped>
            {(r) => (
              <span className="text-sm text-foreground">
                {r.intelligenceReport?.candidateSnapshot?.yearsOfExperience || "—"}
              </span>
            )}
          </Row>
          <Row label="Seniority">
            {(r) => (
              <span className="text-sm text-foreground">
                {r.intelligenceReport?.candidateSnapshot?.seniority || "—"}
              </span>
            )}
          </Row>

          {/* Skills section */}
          {skillOrder.length > 0 && (
            <>
              <SectionHeader label={`Skills (${skillOrder.length})`} />
              {skillOrder.map((skill, si) => (
                <Row key={skill} label={skill} striped={si % 2 === 1}>
                  {(r) => {
                    const match = r.intelligenceReport?.skillsMatch?.find(
                      (s) => s.skill === skill
                    );
                    if (!match) {
                      return (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MinusCircle className="w-3.5 h-3.5" />
                          Not assessed
                        </span>
                      );
                    }
                    const meta = ratingMeta[match.rating];
                    return (
                      <Badge
                        variant="outline"
                        className={`gap-1 text-xs font-medium ${meta?.className || ""}`}
                      >
                        {meta?.icon}
                        {meta?.label || match.rating}
                      </Badge>
                    );
                  }}
                </Row>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border bg-muted/30 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground font-medium">Skill ratings:</span>
        {(["Strong", "Adequate", "Weak", "Missing"] as const).map((r) => {
          const meta = ratingMeta[r];
          return (
            <Badge key={r} variant="outline" className={`gap-1 ${meta.className}`}>
              {meta.icon}
              {meta.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

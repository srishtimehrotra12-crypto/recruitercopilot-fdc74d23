import { Users, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CandidateReport } from "@/types/reports";

interface CandidateComparisonProps {
  reports: CandidateReport[];
}

const ratingColor = (rating: string) => {
  switch (rating) {
    case "Strong": return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "Adequate": return "bg-sky-100 text-sky-800 border-sky-200";
    case "Weak": return "bg-amber-100 text-amber-800 border-amber-200";
    case "Missing": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-muted text-muted-foreground";
  }
};

const verdictBg = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500 text-primary-foreground";
  if (v.includes("hire")) return "bg-primary text-primary-foreground";
  if (v.includes("maybe")) return "bg-amber-500 text-primary-foreground";
  return "bg-destructive text-destructive-foreground";
};

const scoreColor = (score: number) => {
  if (score >= 85) return "text-emerald-600";
  if (score >= 65) return "text-sky-600";
  if (score >= 45) return "text-amber-600";
  return "text-red-600";
};

export function CandidateComparison({ reports }: CandidateComparisonProps) {
  if (reports.length < 2) return null;

  // Collect all unique skills across candidates
  const allSkills = Array.from(
    new Set(
      reports.flatMap(r => r.intelligenceReport?.skillsMatch?.map(s => s.skill) || [])
    )
  );

  // Determine top pick (highest score; first in case of tie)
  const topScore = Math.max(...reports.map(r => r.score));
  const topIndex = reports.findIndex(r => r.score === topScore);

  const topCellClass = "bg-primary/5";

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Candidate Comparison
      </h3>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Criteria</TableHead>
              {reports.map((r, i) => (
                <TableHead
                  key={i}
                  className={`text-center min-w-[120px] ${i === topIndex ? `${topCellClass} text-foreground` : ""}`}
                >
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <span>{r.name}</span>
                    {i === topIndex && (
                      <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1">
                        <Crown className="w-3 h-3" />
                        Top Pick
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Score */}
            <TableRow>
              <TableCell className="font-medium">Score</TableCell>
              {reports.map((r, i) => (
                <TableCell key={i} className={`text-center ${i === topIndex ? topCellClass : ""}`}>
                  <span className={`text-xl font-bold ${scoreColor(r.score)}`}>{r.score}</span>
                  <span className="text-muted-foreground text-xs">/100</span>
                </TableCell>
              ))}
            </TableRow>

            {/* Verdict */}
            <TableRow>
              <TableCell className="font-medium">Verdict</TableCell>
              {reports.map((r, i) => (
                <TableCell key={i} className={`text-center ${i === topIndex ? topCellClass : ""}`}>
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${verdictBg(r.verdict)}`}>
                    {r.verdict}
                  </span>
                </TableCell>
              ))}
            </TableRow>

            {/* Confidence */}
            <TableRow>
              <TableCell className="font-medium">Confidence</TableCell>
              {reports.map((r, i) => (
                <TableCell key={i} className={`text-center text-sm text-muted-foreground ${i === topIndex ? topCellClass : ""}`}>
                  {r.intelligenceReport?.confidenceLevel || "N/A"}
                </TableCell>
              ))}
            </TableRow>

            {/* Skills */}
            {allSkills.map((skill, si) => (
              <TableRow key={si}>
                <TableCell className="font-medium text-sm">{skill}</TableCell>
                {reports.map((r, i) => {
                  const match = r.intelligenceReport?.skillsMatch?.find(s => s.skill === skill);
                  return (
                    <TableCell key={i} className={`text-center ${i === topIndex ? topCellClass : ""}`}>
                      {match ? (
                        <Badge variant="outline" className={`text-xs ${ratingColor(match.rating)}`}>
                          {match.rating}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

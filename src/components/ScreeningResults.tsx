import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Sparkles, User } from "lucide-react";

interface ScreeningResultsProps {
  result: string;
  isScreening: boolean;
}

const scoreTone = (score: number) => {
  if (score >= 85) return { text: "text-emerald-600", bg: "bg-emerald-500", soft: "bg-emerald-50 border-emerald-200" };
  if (score >= 65) return { text: "text-sky-600", bg: "bg-sky-500", soft: "bg-sky-50 border-sky-200" };
  if (score >= 45) return { text: "text-amber-600", bg: "bg-amber-500", soft: "bg-amber-50 border-amber-200" };
  return { text: "text-red-600", bg: "bg-red-500", soft: "bg-red-50 border-red-200" };
};

const recommendationStyle = (rec: string) => {
  const v = rec.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500 text-white";
  if (v.includes("hire")) return "bg-primary text-primary-foreground";
  if (v.includes("maybe")) return "bg-amber-500 text-white";
  if (v.includes("pass")) return "bg-red-500 text-white";
  return "bg-muted text-muted-foreground";
};

type Section = "strengths" | "gaps" | "recommendation" | null;

interface CandidateBlock {
  name: string;
  score?: number;
  recommendation?: string;
  strengths: string[];
  gaps: string[];
  notes: string[];
}

function parseResult(raw: string): { intro: string[]; candidates: CandidateBlock[] } {
  const lines = raw.split("\n");
  const intro: string[] = [];
  const candidates: CandidateBlock[] = [];
  let current: CandidateBlock | null = null;
  let section: Section = null;

  const startCandidate = (name: string) => {
    current = { name: name.trim(), strengths: [], gaps: [], notes: [] };
    candidates.push(current);
    section = null;
  };

  const cleanInline = (s: string) => s.replace(/^\*+\s*|\s*\*+$/g, "").trim();

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r/g, "");
    const trimmed = line.trim();
    if (!trimmed) continue;

    // New candidate header (## or # or "Candidate N:" pattern)
    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    const candHeading =
      headingMatch &&
      (/candidate|^\d+\.|^[A-Z][a-z]+\s+[A-Z]/.test(headingMatch[1]) ||
        candidates.length === 0 ||
        true);

    if (headingMatch && candHeading) {
      // Skip generic "Ranking" headers
      const h = headingMatch[1].trim();
      if (/^ranking|^summary|^overall/i.test(h) && !current) {
        intro.push(h);
        continue;
      }
      startCandidate(h.replace(/^\d+\.\s*/, ""));
      continue;
    }

    if (!current) {
      intro.push(trimmed);
      continue;
    }

    // Score
    const scoreMatch = trimmed.match(/\*?\*?score\*?\*?\s*[:\-]\s*\*?\*?(\d{1,3})/i);
    if (scoreMatch) {
      current.score = Math.min(100, parseInt(scoreMatch[1], 10));
      section = null;
      continue;
    }

    // Recommendation
    const recMatch = trimmed.match(/\*?\*?recommendation\*?\*?\s*[:\-]\s*(.+)$/i);
    if (recMatch) {
      current.recommendation = cleanInline(recMatch[1]);
      section = null;
      continue;
    }

    // Section headers
    if (/^\*?\*?strengths?\*?\*?\s*[:\-]?$/i.test(trimmed)) {
      section = "strengths";
      continue;
    }
    if (/^\*?\*?(gaps?|concerns?|weaknesses?)\*?\*?\s*[:\-]?$/i.test(trimmed)) {
      section = "gaps";
      continue;
    }

    // Inline labeled lines like "**Strengths**: foo, bar"
    const inlineStrengths = trimmed.match(/^\*?\*?strengths?\*?\*?\s*[:\-]\s*(.+)$/i);
    if (inlineStrengths) {
      const items = inlineStrengths[1].split(/[;•]|,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean);
      current.strengths.push(...items);
      section = "strengths";
      continue;
    }
    const inlineGaps = trimmed.match(/^\*?\*?(gaps?|concerns?)\*?\*?\s*[:\-]\s*(.+)$/i);
    if (inlineGaps) {
      const items = inlineGaps[2].split(/[;•]|,(?![^()]*\))/).map((s) => s.trim()).filter(Boolean);
      current.gaps.push(...items);
      section = "gaps";
      continue;
    }

    // Bullet items
    if (/^[-*•]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*•]\s+/, "");
      if (section === "strengths") current.strengths.push(item);
      else if (section === "gaps") current.gaps.push(item);
      else current.notes.push(item);
      continue;
    }

    current.notes.push(trimmed);
  }

  return { intro, candidates };
}

function renderInline(text: string, key: string | number) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={`${key}-${i}`} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={`${key}-${i}`}>{part}</span>;
      })}
    </>
  );
}

export function ScreeningResults({ result, isScreening }: ScreeningResultsProps) {
  if (!result && !isScreening) return null;

  const { intro, candidates } = result ? parseResult(result) : { intro: [], candidates: [] };

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          Screening Results
        </h3>
        {candidates.length > 0 && (
          <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
            {candidates.length} candidate{candidates.length === 1 ? "" : "s"} ranked
          </span>
        )}
      </div>

      {isScreening && !result && (
        <div className="flex items-center gap-3 text-muted-foreground py-6">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Analyzing candidates...</span>
        </div>
      )}

      {result && (
        <div className="space-y-5">
          {intro.length > 0 && (
            <div className="text-sm text-muted-foreground space-y-1">
              {intro.map((line, i) => (
                <p key={i}>{renderInline(line, `intro-${i}`)}</p>
              ))}
            </div>
          )}

          {candidates.map((c, idx) => {
            const tone = scoreTone(c.score ?? 0);
            return (
              <div
                key={idx}
                className="relative bg-background border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Top accent bar */}
                <div className={`h-1 w-full ${tone.bg}`} />

                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {idx === 0 ? <Sparkles className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-foreground">{c.name}</h4>
                          {idx === 0 && c.score !== undefined && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Top Match
                            </span>
                          )}
                        </div>
                        {c.recommendation && (
                          <span
                            className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${recommendationStyle(
                              c.recommendation
                            )}`}
                          >
                            {c.recommendation}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    {c.score !== undefined && (
                      <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${tone.soft}`}>
                        <div className="text-right">
                          <div className={`text-2xl font-bold leading-none ${tone.text}`}>{c.score}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                            / 100
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Score bar */}
                  {c.score !== undefined && (
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${tone.bg} transition-all duration-700 rounded-full`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                  )}

                  {/* Strengths & Gaps grid */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {c.strengths.length > 0 && (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                            Strengths
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {c.strengths.map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/90">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                              <span>{renderInline(s, `s-${idx}-${i}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.gaps.length > 0 && (
                      <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                            Gaps
                          </span>
                        </div>
                        <ul className="space-y-1.5">
                          {c.gaps.map((g, i) => (
                            <li key={i} className="flex gap-2 text-sm text-foreground/90">
                              <span className="text-amber-600 mt-0.5 flex-shrink-0">•</span>
                              <span>{renderInline(g, `g-${idx}-${i}`)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {c.notes.length > 0 && (
                    <div className="text-sm text-foreground/80 space-y-1 pt-1 border-t border-border">
                      {c.notes.map((n, i) => (
                        <p key={i}>{renderInline(n, `n-${idx}-${i}`)}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isScreening && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Generating more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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

interface MarkdownTable {
  kind: "table";
  headers: string[];
  rows: string[][];
}

type IntroBlock = string | MarkdownTable;

interface CandidateBlock {
  name: string;
  score?: number;
  recommendation?: string;
  strengths: string[];
  gaps: string[];
  notes: (string | MarkdownTable)[];
}

// Parse a contiguous block of markdown table lines starting at index `i`.
// Returns the table and the index AFTER the last consumed line, or null if not a table.
function tryParseTable(
  lines: string[],
  i: number,
  stripStars: (s: string) => string
): { table: MarkdownTable; next: number } | null {
  const headerLine = lines[i]?.trim();
  const sepLine = lines[i + 1]?.trim();
  if (!headerLine || !sepLine) return null;
  if (!headerLine.includes("|")) return null;
  // Separator line: | :--- | :--- | etc
  if (!/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(sepLine)) return null;

  const splitRow = (row: string) =>
    row
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => stripStars(c.trim()));

  const headers = splitRow(headerLine);
  const rows: string[][] = [];
  let j = i + 2;
  while (j < lines.length) {
    const row = lines[j].trim();
    if (!row || !row.includes("|")) break;
    rows.push(splitRow(row));
    j++;
  }
  return { table: { kind: "table", headers, rows }, next: j };
}

function parseResult(raw: string): { intro: IntroBlock[]; candidates: CandidateBlock[] } {
  const lines = raw.split("\n");
  const intro: IntroBlock[] = [];
  const candidates: CandidateBlock[] = [];
  let current: CandidateBlock | null = null;
  let section: Section = null;

  const startCandidate = (name: string) => {
    current = { name: name.trim(), strengths: [], gaps: [], notes: [] };
    candidates.push(current);
    section = null;
  };

  const stripStars = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(?<!\*)\*(?!\*)([^*]+)\*(?!\*)/g, "$1")
      .replace(/\*+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  const cleanInline = (s: string) => stripStars(s);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].replace(/\r/g, "");
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    // Detect markdown table block
    const tableHit = tryParseTable(lines, i, stripStars);
    if (tableHit) {
      if (current) current.notes.push(tableHit.table);
      else intro.push(tableHit.table);
      i = tableHit.next;
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      const h = stripStars(headingMatch[1]);
      if (/^ranking|^summary|^overall|^comparison/i.test(h) && !current) {
        intro.push(h);
        i++;
        continue;
      }
      startCandidate(h.replace(/^\d+\.\s*/, ""));
      i++;
      continue;
    }

    if (!current) {
      intro.push(stripStars(trimmed));
      i++;
      continue;
    }

    const scoreMatch = trimmed.match(/\*?\*?score\*?\*?\s*[:\-]\s*\*?\*?(\d{1,3})/i);
    if (scoreMatch) {
      current.score = Math.min(100, parseInt(scoreMatch[1], 10));
      section = null;
      i++;
      continue;
    }

    const recMatch = trimmed.match(/\*?\*?recommendation\*?\*?\s*[:\-]\s*(.+)$/i);
    if (recMatch) {
      current.recommendation = cleanInline(recMatch[1]);
      section = null;
      i++;
      continue;
    }

    if (/^\*?\*?strengths?\*?\*?\s*[:\-]?$/i.test(trimmed)) {
      section = "strengths";
      i++;
      continue;
    }
    if (/^\*?\*?(gaps?|concerns?|weaknesses?)\*?\*?\s*[:\-]?$/i.test(trimmed)) {
      section = "gaps";
      i++;
      continue;
    }

    const inlineStrengths = trimmed.match(/^\*?\*?strengths?\*?\*?\s*[:\-]\s*(.+)$/i);
    if (inlineStrengths) {
      const items = inlineStrengths[1].split(/[;•]|,(?![^()]*\))/).map((s) => stripStars(s)).filter(Boolean);
      current.strengths.push(...items);
      section = "strengths";
      i++;
      continue;
    }
    const inlineGaps = trimmed.match(/^\*?\*?(gaps?|concerns?)\*?\*?\s*[:\-]\s*(.+)$/i);
    if (inlineGaps) {
      const items = inlineGaps[2].split(/[;•]|,(?![^()]*\))/).map((s) => stripStars(s)).filter(Boolean);
      current.gaps.push(...items);
      section = "gaps";
      i++;
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const item = stripStars(trimmed.replace(/^[-*•]\s+/, ""));
      if (item) {
        if (section === "strengths") current.strengths.push(item);
        else if (section === "gaps") current.gaps.push(item);
        else current.notes.push(item);
      }
      i++;
      continue;
    }

    current.notes.push(stripStars(trimmed));
    i++;
  }

  return { intro, candidates };
}

function ComparisonTable({ table }: { table: MarkdownTable }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border-2 border-border shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-primary/10 border-b-2 border-primary/30">
            {table.headers.map((h, hi) => (
              <th
                key={hi}
                className={`px-3 py-2.5 text-left font-bold text-foreground border-r border-border last:border-r-0 ${
                  hi === 0 ? "bg-primary/15" : ""
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr
              key={ri}
              className={`border-b border-border last:border-b-0 hover:bg-muted/40 transition-colors ${
                ri % 2 === 1 ? "bg-muted/20" : "bg-card"
              }`}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2.5 border-r border-border last:border-r-0 align-top ${
                    ci === 0
                      ? "font-semibold text-foreground bg-muted/30"
                      : "text-foreground/85"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
            <div className="text-sm text-muted-foreground space-y-2">
              {intro.map((line, i) =>
                typeof line === "string" ? (
                  <p key={i}>{renderInline(line, `intro-${i}`)}</p>
                ) : (
                  <ComparisonTable key={i} table={line} />
                )
              )}
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
                    <div className="text-sm text-foreground/80 space-y-2 pt-1 border-t border-border">
                      {c.notes.map((n, i) =>
                        typeof n === "string" ? (
                          <p key={i}>{renderInline(n, `n-${idx}-${i}`)}</p>
                        ) : (
                          <ComparisonTable key={i} table={n} />
                        )
                      )}
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

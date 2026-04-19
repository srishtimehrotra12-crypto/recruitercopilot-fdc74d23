import type { CandidateReport } from "@/types/reports";

const escapeCsv = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const deriveStatus = (verdict: string): string => {
  const v = (verdict || "").toLowerCase();
  if (v.includes("strong hire")) return "Strong Hire";
  if (v.includes("no hire") || v.includes("pass")) return "Pass";
  if (v.includes("hire")) return "Hire";
  if (v.includes("maybe")) return "Maybe";
  return verdict || "Review";
};

export function downloadCandidatesCsv(reports: CandidateReport[], filename = "candidates.csv") {
  if (!reports || reports.length === 0) return;

  const sorted = [...reports].sort((a, b) => b.score - a.score);

  const headers = [
    "Rank",
    "Name",
    "Score",
    "Status",
    "Verdict",
    "Matched Skills",
    "Missing Skills",
    "Years of Experience",
    "Current Role",
    "Confidence",
  ];

  const rows = sorted.map((r, idx) => {
    const matched = r.intelligenceReport.skillsMatch
      .filter((s) => s.rating === "Strong" || s.rating === "Adequate")
      .map((s) => s.skill);
    const missing = r.intelligenceReport.skillsMatch
      .filter((s) => s.rating === "Missing" || s.rating === "Weak")
      .map((s) => (s.required ? `${s.skill} (required)` : s.skill));

    return [
      idx + 1,
      r.name,
      r.score,
      deriveStatus(r.verdict),
      r.verdict,
      matched.join("; "),
      missing.join("; "),
      r.intelligenceReport.candidateSnapshot?.yearsOfExperience || "",
      r.intelligenceReport.candidateSnapshot?.currentRole || "",
      r.intelligenceReport.confidenceLevel || "",
    ];
  });

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  // BOM for Excel UTF-8 compatibility
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

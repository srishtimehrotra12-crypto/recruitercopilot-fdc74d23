import jsPDF from "jspdf";
import type { CandidateReport } from "@/types/reports";

const COLORS = {
  primary: [22, 128, 113] as [number, number, number],     // teal
  accent: [234, 170, 30] as [number, number, number],      // amber
  dark: [30, 41, 59] as [number, number, number],           // slate-800
  medium: [100, 116, 139] as [number, number, number],      // slate-500
  light: [241, 245, 249] as [number, number, number],       // slate-100
  white: [255, 255, 255] as [number, number, number],
  red: [220, 60, 60] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;

function ratingColor(rating: string): [number, number, number] {
  switch (rating) {
    case "Strong": return COLORS.green;
    case "Adequate": return COLORS.blue;
    case "Weak": return [217, 119, 6];
    case "Missing": return COLORS.red;
    default: return COLORS.medium;
  }
}

export function generateReportPDF(report: CandidateReport): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  const checkPage = (needed: number) => {
    if (y + needed > PAGE_H - 25) {
      addFooter(doc, report.name);
      doc.addPage();
      y = MARGIN;
    }
  };

  // === COVER / HEADER ===
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_W, 52, "F");

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 52, PAGE_W, 4, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("RECRUITERCOPILOT", MARGIN, 16);

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Intelligence Report", MARGIN, 30);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(report.name, MARGIN, 42);

  // Score badge
  const scoreX = PAGE_W - MARGIN - 20;
  doc.setFillColor(...COLORS.white);
  doc.circle(scoreX, 30, 14, "F");
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const scoreStr = String(report.score);
  doc.text(scoreStr, scoreX - doc.getTextWidth(scoreStr) / 2, 33);
  doc.setTextColor(...COLORS.medium);
  doc.setFontSize(7);
  const ofStr = "/ 100";
  doc.text(ofStr, scoreX - doc.getTextWidth(ofStr) / 2, 39);

  y = 66;

  // Verdict bar
  doc.setFillColor(...COLORS.light);
  doc.roundedRect(MARGIN, y, CONTENT_W, 14, 3, 3, "F");
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Verdict: ${report.verdict}`, MARGIN + 6, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.medium);
  doc.text(`Confidence: ${report.intelligenceReport?.confidenceLevel || "N/A"}`, MARGIN + 6, y + 11.5);
  const dateStr = `Generated: ${new Date().toLocaleDateString()}`;
  doc.text(dateStr, PAGE_W - MARGIN - doc.getTextWidth(dateStr) - 6, y + 6);
  y += 22;

  const ir = report.intelligenceReport;
  const ik = report.interviewKit;

  // === INTELLIGENCE REPORT ===
  if (ir) {
    y = sectionTitle(doc, y, "Executive Summary", COLORS.primary);
    checkPage(20);
    y = wrappedText(doc, y, ir.executiveSummary, COLORS.dark);
    y += 4;

    // Skills Match Table
    y = sectionTitle(doc, y, "Skills Match Analysis", COLORS.primary);
    checkPage(10 + (ir.skillsMatch?.length || 0) * 8);
    if (ir.skillsMatch?.length) {
      // Header
      doc.setFillColor(...COLORS.dark);
      doc.rect(MARGIN, y, CONTENT_W, 7, "F");
      doc.setTextColor(...COLORS.white);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Skill", MARGIN + 4, y + 5);
      doc.text("Required", MARGIN + 100, y + 5);
      doc.text("Rating", MARGIN + 135, y + 5);
      y += 7;

      ir.skillsMatch.forEach((s, i) => {
        checkPage(8);
        const bg = i % 2 === 0 ? COLORS.light : COLORS.white;
        doc.setFillColor(...bg);
        doc.rect(MARGIN, y, CONTENT_W, 7, "F");
        doc.setTextColor(...COLORS.dark);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(s.skill, MARGIN + 4, y + 5);
        doc.text(s.required ? "Yes" : "No", MARGIN + 100, y + 5);
        const rc = ratingColor(s.rating);
        doc.setTextColor(...rc);
        doc.setFont("helvetica", "bold");
        doc.text(s.rating, MARGIN + 135, y + 5);
        y += 7;
      });
      y += 4;
    }

    checkPage(20);
    y = sectionTitle(doc, y, "Experience Relevance", COLORS.primary);
    y = wrappedText(doc, y, ir.experienceRelevance, COLORS.dark);
    y += 4;

    checkPage(20);
    y = sectionTitle(doc, y, "Cultural & Soft Skills Indicators", COLORS.primary);
    y = wrappedText(doc, y, ir.culturalIndicators, COLORS.dark);
    y += 4;

    checkPage(20);
    y = sectionTitle(doc, y, "Risk Factors & Red Flags", [217, 119, 6]);
    y = wrappedText(doc, y, ir.riskFactors, COLORS.dark);
    y += 4;

    checkPage(20);
    y = sectionTitle(doc, y, "Overall Verdict", COLORS.primary);
    y = wrappedText(doc, y, ir.overallVerdict, COLORS.dark);
    y += 4;

    checkPage(20);
    y = sectionTitle(doc, y, "Recommended Next Steps", COLORS.primary);
    y = wrappedText(doc, y, ir.recommendedNextSteps, COLORS.dark);
    y += 6;
  }

  // === INTERVIEW KIT (new page) ===
  if (ik) {
    addFooter(doc, report.name);
    doc.addPage();
    y = MARGIN;

    // Kit header
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, PAGE_W, 20, "F");
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Interview Kit", MARGIN, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const nameW = doc.getTextWidth(report.name);
    doc.text(report.name, PAGE_W - MARGIN - nameW, 14);
    y = 28;

    // Meta
    doc.setFillColor(...COLORS.light);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, "F");
    doc.setTextColor(...COLORS.medium);
    doc.setFontSize(9);
    doc.text(`Duration: ${ik.suggestedDuration || "45-60 min"}  |  Format: ${ik.suggestedFormat || "Panel"}`, MARGIN + 4, y + 7);
    y += 16;

    y = questionSection(doc, y, "Behavioral Questions", ik.behavioralQuestions, COLORS.primary, checkPage);
    y = questionSection(doc, y, "Technical / Role-Specific Questions", ik.technicalQuestions, COLORS.blue, checkPage);

    // Red Flag
    if (ik.redFlagQuestions?.length) {
      checkPage(15);
      y = sectionTitle(doc, y, "Red Flag Probing Questions", [217, 119, 6]);
      ik.redFlagQuestions.forEach((q, i) => {
        checkPage(16);
        doc.setFillColor(254, 243, 199);
        doc.rect(MARGIN, y, 2, 12, "F");
        doc.setTextColor(...COLORS.dark);
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        y = wrappedTextAt(doc, MARGIN + 6, y + 4, `${i + 1}. ${q.question}`, CONTENT_W - 6, COLORS.dark, "bold");
        doc.setFont("helvetica", "italic");
        y = wrappedTextAt(doc, MARGIN + 6, y, `Context: ${q.context}`, CONTENT_W - 6, COLORS.medium, "italic");
        y += 4;
      });
      y += 2;
    }

    // Evaluation
    if (ik.evaluationCriteria) {
      checkPage(20);
      y = sectionTitle(doc, y, "Evaluation Criteria", COLORS.primary);
      y = wrappedText(doc, y, ik.evaluationCriteria, COLORS.dark);
    }
  }

  addFooter(doc, report.name);
  return doc;
}

function addFooter(doc: jsPDF, name: string) {
  doc.setDrawColor(...COLORS.light);
  doc.line(MARGIN, PAGE_H - 15, PAGE_W - MARGIN, PAGE_H - 15);
  doc.setTextColor(...COLORS.medium);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("RecruiterCopilot — Confidential", MARGIN, PAGE_H - 10);
  const pg = `Page ${doc.getNumberOfPages()}`;
  doc.text(pg, PAGE_W - MARGIN - doc.getTextWidth(pg), PAGE_H - 10);
}

function sectionTitle(doc: jsPDF, y: number, title: string, color: [number, number, number]): number {
  doc.setFillColor(...color);
  doc.rect(MARGIN, y, 3, 6, "F");
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(title, MARGIN + 6, y + 5);
  return y + 10;
}

function wrappedText(doc: jsPDF, y: number, text: string, color: [number, number, number]): number {
  return wrappedTextAt(doc, MARGIN, y, text, CONTENT_W, color, "normal");
}

function wrappedTextAt(doc: jsPDF, x: number, y: number, text: string, maxW: number, color: [number, number, number], style: string): number {
  doc.setTextColor(...color);
  doc.setFontSize(9);
  doc.setFont("helvetica", style as any);
  const lines = doc.splitTextToSize(text || "", maxW);
  doc.text(lines, x, y);
  return y + lines.length * 4;
}

function questionSection(
  doc: jsPDF, y: number, title: string,
  questions: { question: string; purpose: string; lookFor: string }[] | undefined,
  color: [number, number, number],
  checkPage: (n: number) => void
): number {
  if (!questions?.length) return y;
  checkPage(15);
  y = sectionTitle(doc, y, title, color);

  questions.forEach((q, i) => {
    checkPage(20);
    doc.setTextColor(...COLORS.dark);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    y = wrappedTextAt(doc, MARGIN + 4, y, `${i + 1}. ${q.question}`, CONTENT_W - 4, COLORS.dark, "bold");
    y = wrappedTextAt(doc, MARGIN + 8, y, `Purpose: ${q.purpose}`, CONTENT_W - 8, COLORS.medium, "normal");
    y = wrappedTextAt(doc, MARGIN + 8, y, `Look for: ${q.lookFor}`, CONTENT_W - 8, COLORS.medium, "italic");
    y += 3;
  });
  return y + 2;
}

export function downloadReportPDF(report: CandidateReport) {
  const doc = generateReportPDF(report);
  doc.save(`${report.name.replace(/\s+/g, "_")}_Intelligence_Report.pdf`);
}

import { useState, useRef } from "react";
import { FileText, ClipboardList, Download, ChevronLeft, ChevronRight, Shield, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { CandidateReport } from "@/types/reports";
import { downloadReportPDF } from "@/lib/pdfReportGenerator";

interface CandidateReportsProps {
  reports: CandidateReport[];
  isGenerating: boolean;
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

const verdictColor = (verdict: string) => {
  const v = verdict.toLowerCase();
  if (v.includes("strong hire")) return "bg-emerald-500";
  if (v.includes("hire")) return "bg-primary";
  if (v.includes("maybe")) return "bg-amber-500";
  return "bg-destructive";
};

export function CandidateReports({ reports, isGenerating }: CandidateReportsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  if (isGenerating) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 card-shadow animate-fade-in">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <h3 className="font-semibold text-foreground">Generating Intelligence Reports & Interview Kits</h3>
            <p className="text-sm text-muted-foreground mt-1">Analyzing each candidate in depth...</p>
          </div>
        </div>
      </div>
    );
  }

  if (reports.length === 0) return null;

  const report = reports[selectedIndex];
  if (!report) return null;

  const handleDownload = () => {
    downloadReportPDF(report);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in space-y-6" ref={reportRef}>
      {/* Candidate Selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Candidate Reports
        </h3>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="w-4 h-4 mr-1" /> Download PDF
        </Button>
      </div>

      {reports.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Button variant="ghost" size="icon" className="shrink-0" disabled={selectedIndex === 0} onClick={() => setSelectedIndex(i => i - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          {reports.map((r, i) => (
            <button
              key={i}
              onClick={() => setSelectedIndex(i)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                i === selectedIndex
                  ? "hero-gradient text-primary-foreground shadow"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {r.name}
            </button>
          ))}
          <Button variant="ghost" size="icon" className="shrink-0" disabled={selectedIndex === reports.length - 1} onClick={() => setSelectedIndex(i => i + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Score Header */}
      <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg">
        <div className="w-16 h-16 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
          {report.score}
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground">{report.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold text-primary-foreground ${verdictColor(report.verdict)}`}>
              {report.verdict}
            </span>
            <span className="text-xs text-muted-foreground">
              Confidence: {report.intelligenceReport?.confidenceLevel || "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="report" className="flex items-center gap-1.5">
            <Shield className="w-4 h-4" /> Intelligence Report
          </TabsTrigger>
          <TabsTrigger value="interview" className="flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Interview Kit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-5 mt-4">
          <IntelligenceReportView report={report.intelligenceReport} />
        </TabsContent>

        <TabsContent value="interview" className="space-y-5 mt-4">
          <InterviewKitView kit={report.interviewKit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntelligenceReportView({ report }: { report: CandidateReport["intelligenceReport"] }) {
  if (!report) return <p className="text-sm text-muted-foreground">Report data unavailable.</p>;

  return (
    <>
      {/* Executive Summary */}
      <Section icon={<Target className="w-4 h-4 text-primary" />} title="Executive Summary">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.executiveSummary}</p>
      </Section>

      {/* Skills Match */}
      <Section icon={<CheckCircle className="w-4 h-4 text-primary" />} title="Skills Match Analysis">
        <div className="grid gap-2">
          {report.skillsMatch?.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 rounded-md">
              <span className="text-sm text-foreground">{s.skill}</span>
              <Badge variant="outline" className={`text-xs ${ratingColor(s.rating)}`}>
                {s.rating}
              </Badge>
            </div>
          ))}
        </div>
      </Section>

      {/* Experience */}
      <Section icon={<FileText className="w-4 h-4 text-primary" />} title="Experience Relevance">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.experienceRelevance}</p>
      </Section>

      {/* Cultural */}
      <Section title="Cultural & Soft Skills Indicators">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.culturalIndicators}</p>
      </Section>

      {/* Risk Factors */}
      <Section icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Risk Factors & Red Flags">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.riskFactors}</p>
      </Section>

      {/* Verdict */}
      <Section title="Overall Verdict">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.overallVerdict}</p>
      </Section>

      {/* Next Steps */}
      <Section title="Recommended Next Steps">
        <p className="text-sm text-foreground/90 leading-relaxed">{report.recommendedNextSteps}</p>
      </Section>
    </>
  );
}

function InterviewKitView({ kit }: { kit: CandidateReport["interviewKit"] }) {
  if (!kit) return <p className="text-sm text-muted-foreground">Interview kit unavailable.</p>;

  return (
    <>
      <div className="flex items-center gap-4 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
        <span>⏱ {kit.suggestedDuration || "45-60 min"}</span>
        <span>📋 {kit.suggestedFormat || "Panel interview"}</span>
      </div>

      {/* Behavioral */}
      <Section title="Behavioral Questions">
        <QuestionList questions={kit.behavioralQuestions} />
      </Section>

      {/* Technical */}
      <Section title="Technical / Role-Specific Questions">
        <QuestionList questions={kit.technicalQuestions} />
      </Section>

      {/* Red Flag */}
      <Section icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} title="Red Flag Probing Questions">
        <div className="space-y-3">
          {kit.redFlagQuestions?.map((q, i) => (
            <div key={i} className="border-l-2 border-amber-400 pl-3">
              <p className="text-sm font-medium text-foreground">{q.question}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Context: {q.context}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Evaluation */}
      <Section title="Evaluation Criteria">
        <p className="text-sm text-foreground/90 leading-relaxed">{kit.evaluationCriteria}</p>
      </Section>
    </>
  );
}

function Section({ icon, title, children }: { icon?: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function QuestionList({ questions }: { questions?: { question: string; purpose: string; lookFor: string }[] }) {
  if (!questions?.length) return null;
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="border-l-2 border-primary/40 pl-3">
          <p className="text-sm font-medium text-foreground">{i + 1}. {q.question}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">Purpose:</span> {q.purpose}
          </p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Look for:</span> {q.lookFor}
          </p>
        </div>
      ))}
    </div>
  );
}


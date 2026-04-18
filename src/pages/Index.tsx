import { useRef, useEffect, useCallback, useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { ResumeInput } from "@/components/ResumeInput";
import { ScreeningResults } from "@/components/ScreeningResults";
import { CandidateReports } from "@/components/CandidateReports";
import { CandidateComparison } from "@/components/CandidateComparison";
import { HistoryPanel } from "@/components/HistoryPanel";
import { AiDisclaimer } from "@/components/AiDisclaimer";
import { useScreening } from "@/hooks/useScreening";
import { useHistory } from "@/hooks/useHistory";
import type { ScreeningSession } from "@/hooks/useHistory";
import { Button } from "@/components/ui/button";
import { Briefcase, RotateCcw, Sparkles, Upload, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { extractTextFromPdf } from "@/lib/pdfParser";

const Index = () => {
  const {
    isScreening,
    result,
    resumes,
    jobDescription,
    setJobDescription,
    setResult,
    addResume,
    removeResume,
    clearAll,
    screen,
    reports,
    setReports,
    isGeneratingReports,
  } = useScreening();

  const { sessions, saveSession, updateSessionReports, deleteSession, clearHistory } = useHistory();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const prevScreeningRef = useRef(false);
  const lastSavedIdRef = useRef<string | null>(null);
  const prevGeneratingRef = useRef(false);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const [jdProcessing, setJdProcessing] = useState(false);

  const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJdProcessing(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await extractTextFromPdf(file);
        if (!text.trim()) {
          toast.error("Could not extract text (may be a scanned image PDF)");
          return;
        }
      } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        text = await file.text();
      } else {
        toast.error("Only PDF and TXT files are supported");
        return;
      }
      setJobDescription(text);
      toast.success(`Loaded ${file.name}`);
    } catch (err) {
      console.error("JD upload error:", err);
      toast.error("Failed to process file");
    } finally {
      setJdProcessing(false);
      if (jdFileInputRef.current) jdFileInputRef.current.value = "";
    }
  };

  const scrollToWorkspace = () => {
    workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Save session as soon as screening summary completes
  useEffect(() => {
    if (prevScreeningRef.current && !isScreening && result) {
      const id = saveSession(
        jobDescription,
        resumes.map((r) => r.name),
        result,
        reports.length > 0 ? reports : undefined
      );
      lastSavedIdRef.current = id;
    }
    prevScreeningRef.current = isScreening;
  }, [isScreening, result, jobDescription, resumes, reports, saveSession]);

  // When report generation finishes, attach reports to the saved session
  useEffect(() => {
    if (
      prevGeneratingRef.current &&
      !isGeneratingReports &&
      reports.length > 0 &&
      lastSavedIdRef.current
    ) {
      updateSessionReports(lastSavedIdRef.current, reports);
      lastSavedIdRef.current = null;
    }
    prevGeneratingRef.current = isGeneratingReports;
  }, [isGeneratingReports, reports, updateSessionReports]);

  const handleLoadSession = useCallback(
    (session: ScreeningSession) => {
      setJobDescription(session.jobDescription);
      setResult(session.result);
      setReports(session.reports || []);
      workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
      if (!session.reports || session.reports.length === 0) {
        toast.info("Loaded screening summary. Detailed reports weren't saved for this session.");
      }
    },
    [setJobDescription, setResult, setReports]
  );


  const canScreen = !isScreening && jobDescription.trim().length > 0 && resumes.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetStarted={scrollToWorkspace} />

      <main ref={workspaceRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* AI disclaimer at top of workflow */}
        <AiDisclaimer />

        {/* History */}
        <HistoryPanel
          sessions={sessions}
          onLoad={handleLoadSession}
          onDelete={deleteSession}
          onClear={clearHistory}
        />

        {/* Step 1 — Job Description */}
        <StepCard
          step={1}
          icon={<Briefcase className="w-5 h-5" />}
          title="Job Description"
          description="Paste the role description or upload a PDF/TXT file."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => jdFileInputRef.current?.click()}
                disabled={jdProcessing}
              >
                {jdProcessing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" /> Upload PDF/TXT
                  </>
                )}
              </Button>
              <input
                ref={jdFileInputRef}
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleJdUpload}
              />
            </>
          }
        >
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here, or upload a PDF/TXT file."
            rows={6}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          {jobDescription.trim() && (
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <FileText className="w-3 h-3" />
              {jobDescription.trim().split(/\s+/).length} words
            </div>
          )}
        </StepCard>

        {/* Step 2 — Resumes */}
        <StepCard
          step={2}
          icon={<Users className="w-5 h-5" />}
          title="Candidate Resumes"
          description="Add resumes by pasting text or uploading PDF files."
        >
          <ResumeInput resumes={resumes} onAdd={addResume} onRemove={removeResume} />
        </StepCard>

        {/* Step 3 — Action bar */}
        <div className="sticky bottom-4 z-10 bg-card border border-border rounded-xl p-4 card-shadow flex items-center justify-between gap-3 flex-wrap backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm shadow">
              3
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Run AI screening</div>
              <div className="text-xs text-muted-foreground">
                {!jobDescription.trim() && "Add a job description"}
                {jobDescription.trim() && resumes.length === 0 && "Add at least one resume"}
                {canScreen && `Ready to screen ${resumes.length} candidate${resumes.length === 1 ? "" : "s"}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={clearAll} disabled={isScreening} size="sm">
              <RotateCcw className="w-4 h-4 mr-1" /> Clear All
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={screen}
              disabled={!canScreen}
            >
              {isScreening ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  Screening...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Screen Candidates
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results */}
        <ScreeningResults result={result} isScreening={isScreening} />

        {/* Candidate Comparison */}
        <CandidateComparison reports={reports} />

        {/* Intelligence Reports & Interview Kits */}
        <CandidateReports reports={reports} isGenerating={isGeneratingReports} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs sm:text-sm text-muted-foreground space-y-1">
        <p>RecruiterCopilot — AI-Powered Candidate Screening</p>
        <p className="text-muted-foreground/80">
          AI-assisted insights. Final hiring decisions are made by humans.
        </p>
      </footer>
    </div>
  );
};

interface StepCardProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function StepCard({ step, icon, title, description, actions, children }: StepCardProps) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 card-shadow">
      <header className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm shadow shrink-0">
            {step}
          </div>
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <span className="text-primary">{icon}</span>
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

export default Index;

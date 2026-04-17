import { useRef, useEffect, useCallback, useState } from "react";
import { HeroSection } from "@/components/HeroSection";
import { ResumeInput } from "@/components/ResumeInput";
import { ScreeningResults } from "@/components/ScreeningResults";
import { CandidateReports } from "@/components/CandidateReports";
import { CandidateComparison } from "@/components/CandidateComparison";
import { HistoryPanel } from "@/components/HistoryPanel";
import { useScreening } from "@/hooks/useScreening";
import { useHistory } from "@/hooks/useHistory";
import type { ScreeningSession } from "@/hooks/useHistory";
import { Button } from "@/components/ui/button";
import { Briefcase, RotateCcw, Sparkles, Upload } from "lucide-react";
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
    isGeneratingReports,
  } = useScreening();

  const { sessions, saveSession, deleteSession, clearHistory } = useHistory();
  const workspaceRef = useRef<HTMLDivElement>(null);
  const prevScreeningRef = useRef(false);
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

  // Auto-save when screening completes
  useEffect(() => {
    if (prevScreeningRef.current && !isScreening && result) {
      saveSession(
        jobDescription,
        resumes.map((r) => r.name),
        result
      );
    }
    prevScreeningRef.current = isScreening;
  }, [isScreening, result, jobDescription, resumes, saveSession]);

  const handleLoadSession = useCallback(
    (session: ScreeningSession) => {
      setJobDescription(session.jobDescription);
      setResult(session.result);
      workspaceRef.current?.scrollIntoView({ behavior: "smooth" });
    },
    [setJobDescription, setResult]
  );

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onGetStarted={scrollToWorkspace} />

      <main ref={workspaceRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* History */}
        <HistoryPanel
          sessions={sessions}
          onLoad={handleLoadSession}
          onDelete={deleteSession}
          onClear={clearHistory}
        />

        {/* Job Description */}
        <div className="bg-card border border-border rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              Job Description
            </h3>
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
          </div>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here, or upload a PDF/TXT file."
            rows={6}
            className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        {/* Resume Input */}
        <div className="bg-card border border-border rounded-xl p-6 card-shadow">
          <ResumeInput resumes={resumes} onAdd={addResume} onRemove={removeResume} />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={clearAll} disabled={isScreening}>
            <RotateCcw className="w-4 h-4 mr-2" /> Clear All
          </Button>
          <Button
            variant="hero"
            size="lg"
            onClick={screen}
            disabled={isScreening || !jobDescription.trim() || resumes.length === 0}
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

        {/* Results */}
        <ScreeningResults result={result} isScreening={isScreening} />

        {/* Candidate Comparison */}
        <CandidateComparison reports={reports} />

        {/* Intelligence Reports & Interview Kits */}
        <CandidateReports reports={reports} isGenerating={isGeneratingReports} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        RecruiterCopilot — AI-Powered Candidate Screening
      </footer>
    </div>
  );
};

export default Index;

import { useRef, useEffect, useCallback } from "react";
import { HeroSection } from "@/components/HeroSection";
import { ResumeInput } from "@/components/ResumeInput";
import { ScreeningResults } from "@/components/ScreeningResults";
import { CandidateReports } from "@/components/CandidateReports";
import { HistoryPanel } from "@/components/HistoryPanel";
import { useScreening } from "@/hooks/useScreening";
import { useHistory } from "@/hooks/useHistory";
import type { ScreeningSession } from "@/hooks/useHistory";
import { Button } from "@/components/ui/button";
import { Briefcase, RotateCcw, Sparkles } from "lucide-react";

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
          <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-primary" />
            Job Description
          </h3>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here... Include role title, required skills, experience, qualifications, etc."
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

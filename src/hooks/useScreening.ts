import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { CandidateReport } from "@/types/reports";

interface Resume {
  name: string;
  content: string;
}

export function useScreening() {
  const [isScreening, setIsScreening] = useState(false);
  const [result, setResult] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [reports, setReports] = useState<CandidateReport[]>([]);
  const [isGeneratingReports, setIsGeneratingReports] = useState(false);

  const addResume = useCallback((name: string, content: string) => {
    setResumes(prev => [...prev, { name, content }]);
  }, []);

  const removeResume = useCallback((index: number) => {
    setResumes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setResumes([]);
    setJobDescription("");
    setResult("");
    setReports([]);
  }, []);

  const generateReports = useCallback(async (jd: string, res: Resume[], summary: string) => {
    setIsGeneratingReports(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ jobDescription: jd, resumes: res, screeningSummary: summary }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Report generation failed" }));
        toast.error(err.error || "Failed to generate reports");
        return;
      }

      const data = await resp.json();
      if (data.reports && Array.isArray(data.reports)) {
        setReports(data.reports);
        toast.success("Intelligence Reports & Interview Kits ready!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate reports");
    } finally {
      setIsGeneratingReports(false);
    }
  }, []);

  const screen = useCallback(async () => {
    if (!jobDescription.trim()) {
      toast.error("Please enter a job description");
      return;
    }
    if (resumes.length === 0) {
      toast.error("Please add at least one resume");
      return;
    }

    setIsScreening(true);
    setResult("");
    setReports([]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const resp = await fetch(`${supabaseUrl}/functions/v1/screen-candidates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ jobDescription, resumes }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Screening failed" }));
        if (resp.status === 429) toast.error("Rate limit hit. Please wait and try again.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Please add more.");
        else toast.error(err.error || "Screening failed");
        setIsScreening(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      toast.success("Screening complete! Generating reports...");
      setIsScreening(false);

      // Auto-generate reports
      await generateReports(jobDescription, resumes, fullText);
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong. Please try again.");
      setIsScreening(false);
    }
  }, [jobDescription, resumes, generateReports]);

  return {
    isScreening,
    result,
    setResult,
    resumes,
    jobDescription,
    setJobDescription,
    addResume,
    removeResume,
    clearAll,
    screen,
    reports,
    isGeneratingReports,
  };
}

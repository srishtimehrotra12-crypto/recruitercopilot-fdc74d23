import { useState, useCallback, useEffect } from "react";
import type { CandidateReport } from "@/types/reports";

export interface ScreeningSession {
  id: string;
  jobDescription: string;
  resumeNames: string[];
  result: string;
  reports?: CandidateReport[];
  createdAt: string;
}

const STORAGE_KEY = "recruiter-copilot-history";

function loadSessions(): ScreeningSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: ScreeningSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (e) {
    // Storage may be full — drop oldest and retry once
    console.warn("History storage failed, trimming.", e);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 10)));
    } catch {}
  }
}

export function useHistory() {
  const [sessions, setSessions] = useState<ScreeningSession[]>(loadSessions);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  const saveSession = useCallback(
    (
      jobDescription: string,
      resumeNames: string[],
      result: string,
      reports?: CandidateReport[]
    ): string => {
      const session: ScreeningSession = {
        id: crypto.randomUUID(),
        jobDescription,
        resumeNames,
        result,
        reports,
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => [session, ...prev]);
      return session.id;
    },
    []
  );

  const updateSessionReports = useCallback(
    (id: string, reports: CandidateReport[]) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, reports } : s))
      );
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
  }, []);

  return { sessions, saveSession, updateSessionReports, deleteSession, clearHistory };
}

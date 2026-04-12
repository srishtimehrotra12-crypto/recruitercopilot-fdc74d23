import { useState, useCallback, useEffect } from "react";

export interface ScreeningSession {
  id: string;
  jobDescription: string;
  resumeNames: string[];
  result: string;
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function useHistory() {
  const [sessions, setSessions] = useState<ScreeningSession[]>(loadSessions);

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  const saveSession = useCallback(
    (jobDescription: string, resumeNames: string[], result: string) => {
      const session: ScreeningSession = {
        id: crypto.randomUUID(),
        jobDescription,
        resumeNames,
        result,
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) => [session, ...prev]);
    },
    []
  );

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setSessions([]);
  }, []);

  return { sessions, saveSession, deleteSession, clearHistory };
}

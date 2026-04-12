import { useState } from "react";
import { History, Trash2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScreeningSession } from "@/hooks/useHistory";

interface HistoryPanelProps {
  sessions: ScreeningSession[];
  onLoad: (session: ScreeningSession) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({ sessions, onLoad, onDelete, onClear }: HistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (sessions.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Past Screenings ({sessions.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <Trash2 className="w-4 h-4 mr-1" /> Clear All
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {sessions.map((session) => {
            const date = new Date(session.createdAt);
            const label = session.jobDescription.slice(0, 80) + (session.jobDescription.length > 80 ? "…" : "");
            return (
              <div
                key={session.id}
                className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-3"
              >
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-sm font-medium text-foreground truncate">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleDateString()} · {session.resumeNames.length} candidate{session.resumeNames.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => onLoad(session)} title="View results">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(session.id)} title="Delete" className="hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

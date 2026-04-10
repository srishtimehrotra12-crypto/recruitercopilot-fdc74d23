import { BarChart3 } from "lucide-react";

interface ScreeningResultsProps {
  result: string;
  isScreening: boolean;
}

export function ScreeningResults({ result, isScreening }: ScreeningResultsProps) {
  if (!result && !isScreening) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 card-shadow animate-fade-in">
      <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        Screening Results
      </h3>

      {isScreening && !result && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Analyzing candidates...</span>
        </div>
      )}

      {result && (
        <div className="prose prose-sm max-w-none text-foreground">
          {result.split("\n").map((line, i) => {
            if (line.startsWith("# ")) {
              return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>;
            }
            if (line.startsWith("## ")) {
              return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
            }
            if (line.startsWith("### ")) {
              return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{line.slice(4)}</h4>;
            }
            if (line.startsWith("**") && line.endsWith("**")) {
              return <p key={i} className="font-semibold text-foreground my-1">{line.slice(2, -2)}</p>;
            }
            if (line.startsWith("- ")) {
              return <li key={i} className="ml-4 text-sm text-foreground/90">{renderBold(line.slice(2))}</li>;
            }
            if (line.trim() === "") return <div key={i} className="h-2" />;
            return <p key={i} className="text-sm text-foreground/90 my-0.5">{renderBold(line)}</p>;
          })}
          {isScreening && <span className="inline-block w-2 h-4 bg-primary animate-pulse-subtle ml-0.5" />}
        </div>
      )}
    </div>
  );
}

function renderBold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

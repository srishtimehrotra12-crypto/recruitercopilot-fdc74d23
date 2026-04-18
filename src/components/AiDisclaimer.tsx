import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AiDisclaimerProps {
  variant?: "banner" | "inline" | "compact";
  className?: string;
}

/**
 * Reminds users that AI assists but humans decide.
 * Use `banner` at the top of workflows, `inline` inside reports, `compact` for footers.
 */
export function AiDisclaimer({ variant = "banner", className }: AiDisclaimerProps) {
  if (variant === "compact") {
    return (
      <p
        className={cn(
          "text-xs text-muted-foreground italic flex items-center gap-1.5",
          className
        )}
      >
        <Info className="w-3 h-3 shrink-0" />
        AI-assisted insights — final hiring decisions must be made by a human.
      </p>
    );
  }

  const isInline = variant === "inline";

  return (
    <div
      role="note"
      className={cn(
        "rounded-lg border flex gap-3 items-start",
        isInline
          ? "bg-amber-50/60 border-amber-200 p-3"
          : "bg-amber-50 border-amber-200 p-4",
        className
      )}
    >
      <div
        className={cn(
          "shrink-0 rounded-full bg-amber-100 flex items-center justify-center",
          isInline ? "w-7 h-7" : "w-9 h-9"
        )}
      >
        <Info className={cn("text-amber-700", isInline ? "w-3.5 h-3.5" : "w-4 h-4")} />
      </div>
      <div className="space-y-0.5">
        <p
          className={cn(
            "font-semibold text-amber-900",
            isInline ? "text-sm" : "text-sm"
          )}
        >
          AI is here to assist — not to decide.
        </p>
        <p className={cn("text-amber-800/90", isInline ? "text-xs" : "text-xs sm:text-sm")}>
          Reports, scores, and recommendations are AI-generated and may contain errors or
          bias. Use them as a starting point. Every hiring decision must be reviewed and
          made by a qualified human recruiter or hiring manager.
        </p>
      </div>
    </div>
  );
}

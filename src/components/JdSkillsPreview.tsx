import { useState } from "react";
import { ListChecks, Loader2, Sparkles, RefreshCw, ChevronDown, ChevronUp, Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface JdSkill {
  skill: string;
  category: string;
  evidence?: string;
  aliases?: string[];
}

interface ParsedJd {
  jobTitle?: string;
  seniority?: string;
  yearsOfExperience?: string;
  requiredSkills: JdSkill[];
  preferredSkills: JdSkill[];
  keyResponsibilities?: string[];
}

interface JdSkillsPreviewProps {
  jobDescription: string;
}

const categoryColor: Record<string, string> = {
  technical: "bg-sky-50 border-sky-200 text-sky-800",
  tool: "bg-violet-50 border-violet-200 text-violet-800",
  soft: "bg-emerald-50 border-emerald-200 text-emerald-800",
  domain: "bg-amber-50 border-amber-200 text-amber-800",
  certification: "bg-pink-50 border-pink-200 text-pink-800",
  language: "bg-indigo-50 border-indigo-200 text-indigo-800",
  other: "bg-secondary border-border text-foreground",
};

export function JdSkillsPreview({ jobDescription }: JdSkillsPreviewProps) {
  const [parsed, setParsed] = useState<ParsedJd | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const parse = async () => {
    if (!jobDescription.trim()) {
      toast.error("Add a job description first");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-jd", {
        body: { jobDescription },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setParsed(data as ParsedJd);
      setExpanded(true);
      toast.success("JD parsed");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to parse JD");
    } finally {
      setLoading(false);
    }
  };

  const renderChips = (skills: JdSkill[]) =>
    skills.length === 0 ? (
      <p className="text-xs text-muted-foreground italic">None detected</p>
    ) : (
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => {
          const aliases = (s.aliases || []).filter(Boolean);
          const hasMerges = aliases.length > 0;
          return (
            <Tooltip key={`${s.skill}-${i}`} delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border cursor-help focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    categoryColor[s.category] ?? categoryColor.other
                  }`}
                >
                  <span>{s.skill}</span>
                  {hasMerges && (
                    <span className="inline-flex items-center gap-0.5 ml-0.5 px-1.5 py-0.5 rounded-full bg-white/70 border border-black/10 text-[10px] font-bold leading-none">
                      <Merge className="w-2.5 h-2.5" />
                      {aliases.length}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs p-3 space-y-2">
                <div className="text-xs font-semibold text-foreground capitalize">
                  {s.category}
                </div>
                {hasMerges && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                      Merged variants
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aliases.map((a, j) => (
                        <span
                          key={j}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {s.evidence && (
                  <p className="text-xs leading-relaxed text-muted-foreground italic">
                    “{s.evidence}”
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );

  const mergedTotal = parsed
    ? [...parsed.requiredSkills, ...parsed.preferredSkills].reduce(
        (n, s) => n + ((s.aliases?.length || 0) > 0 ? 1 : 0),
        0
      )
    : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-5 card-shadow">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground text-sm">JD Skills Preview</h3>
            <p className="text-xs text-muted-foreground">
              Confirm the AI extracted every required and preferred skill before screening.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {parsed && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {expanded ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button size="sm" variant={parsed ? "outline" : "default"} onClick={parse} disabled={loading || !jobDescription.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Parsing...
              </>
            ) : parsed ? (
              <>
                <RefreshCw className="w-4 h-4 mr-1" /> Re-parse
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-1" /> Parse JD
              </>
            )}
          </Button>
        </div>
      </div>

      {parsed && expanded && (
        <div className="mt-5 space-y-5 animate-fade-in">
          {(parsed.jobTitle || parsed.seniority || parsed.yearsOfExperience) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {parsed.jobTitle && (
                <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                  {parsed.jobTitle}
                </span>
              )}
              {parsed.seniority && (
                <span className="px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
                  {parsed.seniority}
                </span>
              )}
              {parsed.yearsOfExperience && (
                <span className="px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
                  {parsed.yearsOfExperience}
                </span>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-red-200 bg-red-50/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                  Required Skills
                </span>
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                  {parsed.requiredSkills.length}
                </span>
              </div>
              {renderChips(parsed.requiredSkills)}
            </div>

            <div className="border border-sky-200 bg-sky-50/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700">
                  Preferred Skills
                </span>
                <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                  {parsed.preferredSkills.length}
                </span>
              </div>
              {renderChips(parsed.preferredSkills)}
            </div>
          </div>

          {parsed.keyResponsibilities && parsed.keyResponsibilities.length > 0 && (
            <div className="border border-border bg-secondary/30 rounded-lg p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Key Responsibilities
              </div>
              <ul className="space-y-1 text-sm text-foreground/90 list-disc pl-5">
                {parsed.keyResponsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Hover any skill chip to see the evidence snippet from the JD. If something is missing, edit the JD above and re-parse.
          </p>
        </div>
      )}
    </div>
  );
}

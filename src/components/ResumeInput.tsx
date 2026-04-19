import { useState, useRef, useCallback } from "react";
import { FileText, Plus, X, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { extractTextFromPdf } from "@/lib/pdfParser";

const MAX_RESUMES = 20;

interface ResumeInputProps {
  resumes: { name: string; content: string }[];
  onAdd: (name: string, content: string) => void;
  onRemove: (index: number) => void;
}

type FileProgress = {
  id: string;
  name: string;
  progress: number;
  status: "processing" | "done" | "error";
  message?: string;
};

export function ResumeInput({ resumes, onAdd, onRemove }: ResumeInputProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [progressList, setProgressList] = useState<FileProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processing = progressList.some((p) => p.status === "processing");

  const handlePasteAdd = () => {
    if (!pasteName.trim() || !pasteContent.trim()) {
      toast.error("Please enter both a name and resume content");
      return;
    }
    if (resumes.length >= MAX_RESUMES) {
      toast.error(`Maximum ${MAX_RESUMES} resumes allowed`);
      return;
    }
    onAdd(pasteName.trim(), pasteContent.trim());
    setPasteName("");
    setPasteContent("");
    setPasteMode(false);
    toast.success(`Added ${pasteName.trim()}`);
  };

  const updateProgress = (id: string, patch: Partial<FileProgress>) => {
    setProgressList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const processFiles = useCallback(
    async (files: File[]) => {
      const remainingSlots = MAX_RESUMES - resumes.length;
      if (remainingSlots <= 0) {
        toast.error(`Maximum ${MAX_RESUMES} resumes reached`);
        return;
      }
      let toProcess = files;
      if (files.length > remainingSlots) {
        toast.warning(`Only adding first ${remainingSlots} of ${files.length} files (max ${MAX_RESUMES} resumes)`);
        toProcess = files.slice(0, remainingSlots);
      }

      const items: FileProgress[] = toProcess.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${f.name}`,
        name: f.name,
        progress: 0,
        status: "processing",
      }));
      setProgressList((prev) => [...prev, ...items]);

      await Promise.all(
        toProcess.map(async (file, i) => {
          const item = items[i];
          const name = file.name.replace(/\.(pdf|txt)$/i, "");
          try {
            updateProgress(item.id, { progress: 25 });
            const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
            const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

            if (!isPdf && !isTxt) {
              updateProgress(item.id, { status: "error", progress: 100, message: "Only PDF/TXT supported" });
              return;
            }

            updateProgress(item.id, { progress: 55 });
            const text = isPdf ? await extractTextFromPdf(file) : await file.text();
            updateProgress(item.id, { progress: 85 });

            if (!text.trim()) {
              updateProgress(item.id, {
                status: "error",
                progress: 100,
                message: "No text extracted (scanned PDF?)",
              });
              return;
            }

            onAdd(name, text);
            updateProgress(item.id, { status: "done", progress: 100 });
          } catch (err) {
            console.error(`Error processing ${file.name}:`, err);
            updateProgress(item.id, { status: "error", progress: 100, message: "Failed to process" });
          }
        })
      );

      // Auto-clear successful entries after a short delay
      setTimeout(() => {
        setProgressList((prev) => prev.filter((p) => p.status === "error"));
      }, 1500);
    },
    [onAdd, resumes.length]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) await processFiles(files);
    },
    [processFiles]
  );

  const dismissProgress = (id: string) => {
    setProgressList((prev) => prev.filter((p) => p.id !== id));
  };

  const limitReached = resumes.length >= MAX_RESUMES;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Resumes ({resumes.length}/{MAX_RESUMES})
        </h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPasteMode(!pasteMode)}
            disabled={limitReached}
          >
            <Plus className="w-4 h-4 mr-1" /> Paste
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing || limitReached}
          >
            <Upload className="w-4 h-4 mr-1" /> Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {pasteMode && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3 animate-fade-in">
          <input
            type="text"
            placeholder="Candidate name (e.g. Priya Sharma)"
            value={pasteName}
            onChange={(e) => setPasteName(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <textarea
            placeholder="Paste resume text here..."
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setPasteMode(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handlePasteAdd}>
              Add Candidate
            </Button>
          </div>
        </div>
      )}

      {/* Progress list */}
      {progressList.length > 0 && (
        <div className="space-y-2">
          {progressList.map((p) => (
            <div
              key={p.id}
              className="bg-card border border-border rounded-lg px-3 py-2.5 animate-fade-in"
            >
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {p.status === "processing" && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  )}
                  {p.status === "done" && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  )}
                  {p.status === "error" && (
                    <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground tabular-nums">{p.progress}%</span>
                  {p.status !== "processing" && (
                    <button
                      onClick={() => dismissProgress(p.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Progress value={p.progress} className="h-1.5" />
              {p.message && (
                <p
                  className={`text-xs mt-1 ${
                    p.status === "error" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {p.message}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {resumes.length > 0 && (
        <div className="space-y-2">
          {resumes.map((r, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2.5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.content.length} chars</span>
              </div>
              <button
                onClick={() => onRemove(i)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {resumes.length === 0 && !pasteMode && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm font-medium">
            {isDragOver ? "Drop resumes here" : "Drag & drop up to 20 PDF or TXT files"}
          </p>
          <p className="text-muted-foreground text-xs mt-1">or click to browse</p>
        </div>
      )}

      {resumes.length > 0 && !limitReached && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-3 text-center transition-colors text-xs ${
            isDragOver
              ? "border-primary bg-primary/5 text-primary"
              : "border-border text-muted-foreground"
          }`}
        >
          {isDragOver
            ? "Drop here"
            : `Drop more PDF/TXT files here (${MAX_RESUMES - resumes.length} slot${MAX_RESUMES - resumes.length === 1 ? "" : "s"} left)`}
        </div>
      )}

      {limitReached && (
        <div className="text-xs text-muted-foreground text-center py-2 bg-secondary/50 rounded-lg">
          Maximum {MAX_RESUMES} resumes reached. Remove some to add more.
        </div>
      )}
    </div>
  );
}

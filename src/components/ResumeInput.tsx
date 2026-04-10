import { useState, useRef, useCallback } from "react";
import { FileText, Plus, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extractTextFromPdf } from "@/lib/pdfParser";

interface ResumeInputProps {
  resumes: { name: string; content: string }[];
  onAdd: (name: string, content: string) => void;
  onRemove: (index: number) => void;
}

export function ResumeInput({ resumes, onAdd, onRemove }: ResumeInputProps) {
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePasteAdd = () => {
    if (!pasteName.trim() || !pasteContent.trim()) {
      toast.error("Please enter both a name and resume content");
      return;
    }
    onAdd(pasteName.trim(), pasteContent.trim());
    setPasteName("");
    setPasteContent("");
    setPasteMode(false);
    toast.success(`Added ${pasteName.trim()}`);
  };

  const processFiles = useCallback(async (files: File[]) => {
    setProcessing(true);
    for (const file of files) {
      const name = file.name.replace(/\.(pdf|txt)$/i, "");
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const text = await extractTextFromPdf(file);
          if (!text.trim()) {
            toast.error(`${file.name}: Could not extract text (may be a scanned image PDF)`);
            continue;
          }
          onAdd(name, text);
          toast.success(`Added ${file.name}`);
        } else if (file.type === "text/plain" || file.name.endsWith(".txt")) {
          const text = await file.text();
          onAdd(name, text);
          toast.success(`Added ${file.name}`);
        } else {
          toast.error(`${file.name}: Only PDF and TXT files are supported`);
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        toast.error(`${file.name}: Failed to process file`);
      }
    }
    setProcessing(false);
  }, [onAdd]);

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

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Resumes ({resumes.length})
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPasteMode(!pasteMode)}>
            <Plus className="w-4 h-4 mr-1" /> Paste
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={processing}>
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
            <Button variant="ghost" size="sm" onClick={() => setPasteMode(false)}>Cancel</Button>
            <Button size="sm" onClick={handlePasteAdd}>Add Candidate</Button>
          </div>
        </div>
      )}

      {resumes.length > 0 && (
        <div className="space-y-2">
          {resumes.map((r, i) => (
            <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {r.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground">{r.name}</span>
                <span className="text-xs text-muted-foreground">{r.content.length} chars</span>
              </div>
              <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive transition-colors">
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
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          {processing ? (
            <>
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Processing files...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">
                {isDragOver ? "Drop resumes here" : "Drag & drop PDF or TXT files"}
              </p>
              <p className="text-muted-foreground text-xs mt-1">or click to browse</p>
            </>
          )}
        </div>
      )}

      {resumes.length > 0 && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-3 text-center transition-colors text-xs ${
            isDragOver ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          {processing ? "Processing..." : isDragOver ? "Drop here" : "Drop more PDF/TXT files here"}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { FileText, Download, Loader2, AlertCircle, Image, Table, FileCode } from "lucide-react";
import SketchyButton from "@/components/SketchyButton";
import CollaborativeEditor from "@/components/CollaborativeEditor";

interface FileViewerProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileId?: string;
  remoteContent?: string | null;
  remoteFileId?: string | null;
  onEdit?: (fileId: string, content: string) => void;
  onlineUsers?: { userId: string; fullName: string; color: string; activeFileId: string | null }[];
}

type ViewerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; content?: string };

// Helpers to detect file type from mime + extension
const getFileCategory = (mimeType: string, fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // Images
  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "ico"].includes(ext)) {
    return "image";
  }
  // PDF
  if (mimeType === "application/pdf" || ext === "pdf") {
    return "pdf";
  }
  // Word documents
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    ext === "docx"
  ) {
    return "docx";
  }
  // Excel / Spreadsheets
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "text/csv" ||
    ["xlsx", "xls", "csv"].includes(ext)
  ) {
    return "spreadsheet";
  }
  // Plain text / code
  const textExtensions = [
    "txt", "md", "json", "js", "ts", "tsx", "jsx", "py", "java", "c", "cpp",
    "h", "cs", "go", "rb", "php", "html", "css", "scss", "xml", "yaml", "yml",
    "toml", "ini", "cfg", "env", "sh", "bat", "ps1", "sql", "r", "dart", "kt",
    "swift", "rs", "lua", "log",
  ];
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    textExtensions.includes(ext)
  ) {
    return "text";
  }
  // Video
  if (mimeType.startsWith("video/") || ["mp4", "webm", "ogg", "mov", "avi"].includes(ext)) {
    return "video";
  }
  // Audio
  if (mimeType.startsWith("audio/") || ["mp3", "wav", "ogg", "aac", "flac"].includes(ext)) {
    return "audio";
  }

  return "unsupported";
};

export default function FileViewer(props: FileViewerProps) {
  const { fileUrl, fileName, mimeType } = props;
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const category = getFileCategory(mimeType, fileName);

  useEffect(() => {
    let cancelled = false;

    const loadContent = async () => {
      setState({ status: "loading" });

      try {
        if (category === "image" || category === "pdf" || category === "video" || category === "audio") {
          // These use URL directly, no fetching needed
          setState({ status: "ready" });
          return;
        }

        if (category === "docx") {
          const mammoth = await import("mammoth");
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (!cancelled) {
            setState({ status: "ready", content: result.value });
          }
          return;
        }

        if (category === "spreadsheet") {
          const XLSX = await import("xlsx");
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
          const arrayBuffer = await response.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });

          // Convert all sheets to HTML tables
          const htmlParts: string[] = [];
          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const html = XLSX.utils.sheet_to_html(sheet, { editable: false });
            htmlParts.push(
              `<div class="sheet-tab"><h3 style="margin:16px 0 8px;font-family:inherit;font-size:1.1em;font-weight:700;color:var(--foreground,#333);">📄 ${sheetName}</h3>${html}</div>`
            );
          });

          if (!cancelled) {
            setState({ status: "ready", content: htmlParts.join("") });
          }
          return;
        }

        if (category === "text") {
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error(`Failed to fetch file (${response.status})`);
          const text = await response.text();
          if (!cancelled) {
            setState({ status: "ready", content: text });
          }
          return;
        }

        // Unsupported
        setState({ status: "ready" });
      } catch (err: any) {
        if (!cancelled) {
          setState({ status: "error", message: err.message || "Failed to load file" });
        }
      }
    };

    loadContent();
    return () => { cancelled = true; };
  }, [fileUrl, fileName, category]);

  // ── Loading state ──
  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <Loader2 size={40} className="animate-spin text-primary" strokeWidth={2} />
        <p className="text-sm font-sketch text-muted-foreground">Loading {fileName}...</p>
      </div>
    );
  }

  // ── Error state ──
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <AlertCircle size={48} className="text-destructive" strokeWidth={1.5} />
        <p className="text-base font-sketch text-destructive">Failed to load file</p>
        <p className="text-sm font-sketch text-muted-foreground text-center max-w-md">
          {state.message}
        </p>
        <div className="flex gap-2 mt-2">
          <SketchyButton
            variant="default"
            size="sm"
            onClick={() => {
              setState({ status: "loading" });
              // Re-trigger by changing state, the effect will re-run
              window.location.reload();
            }}
          >
            Retry
          </SketchyButton>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <SketchyButton variant="ghost" size="sm">
              <Download size={14} className="mr-1" /> Download Instead
            </SketchyButton>
          </a>
        </div>
      </div>
    );
  }

  // ── Ready states ──

  // Image
  if (category === "image") {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-dashed border-ink/20">
          <Image size={18} strokeWidth={2.5} className="text-marker-green" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <div className="flex justify-center">
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full h-auto rounded-lg border-2 border-ink/10 shadow-sketch-sm"
            style={{ maxHeight: "80vh" }}
          />
        </div>
      </div>
    );
  }

  // PDF
  if (category === "pdf") {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 p-3 pb-2 border-b-2 border-dashed border-ink/20">
          <FileText size={18} strokeWidth={2.5} className="text-marker-red" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <iframe
          src={fileUrl}
          title={fileName}
          className="flex-1 w-full border-0"
          style={{ minHeight: "500px" }}
        />
      </div>
    );
  }

  // DOCX
  if (category === "docx") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex items-center gap-2 p-3 pb-2 border-b-2 border-dashed border-ink/20 sticky top-0 bg-card z-10">
          <FileText size={18} strokeWidth={2.5} className="text-marker-blue" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <div
          className="prose prose-sm max-w-none p-4 font-sketch dark:prose-invert"
          style={{
            lineHeight: "1.7",
            fontSize: "0.95rem",
          }}
          dangerouslySetInnerHTML={{ __html: state.content || "" }}
        />
      </div>
    );
  }

  // Spreadsheet
  if (category === "spreadsheet") {
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex items-center gap-2 p-3 pb-2 border-b-2 border-dashed border-ink/20 sticky top-0 bg-card z-10">
          <Table size={18} strokeWidth={2.5} className="text-marker-green" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <div
          className="p-4 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: state.content || "" }}
          style={{
            fontSize: "0.85rem",
          }}
        />
        <style>{`
          .p-4 table {
            width: 100%;
            border-collapse: collapse;
            font-family: inherit;
          }
          .p-4 table th,
          .p-4 table td {
            border: 2px solid var(--border, #e2e2e2);
            padding: 8px 12px;
            text-align: left;
            font-size: 0.85rem;
          }
          .p-4 table th {
            background: var(--muted, #f5f5f5);
            font-weight: 700;
          }
          .p-4 table tr:nth-child(even) {
            background: var(--muted, #f5f5f5);
            opacity: 0.7;
          }
          .p-4 table tr:hover {
            background: var(--accent, #e8e8e8);
          }
        `}</style>
      </div>
    );
  }

  // Plain text / code
  if (category === "text") {
    // Use collaborative editor when collaboration props are provided
    if (props.fileId && props.onEdit) {
      return (
        <CollaborativeEditor
          fileUrl={fileUrl}
          fileName={fileName}
          fileId={props.fileId}
          remoteContent={props.remoteContent ?? null}
          remoteFileId={props.remoteFileId ?? null}
          onEdit={props.onEdit}
          onlineUsers={props.onlineUsers ?? []}
        />
      );
    }
    // Fallback: read-only view
    const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
    return (
      <div className="h-full overflow-y-auto">
        <div className="flex items-center gap-2 p-3 pb-2 border-b-2 border-dashed border-ink/20 sticky top-0 bg-card z-10">
          <FileCode size={18} strokeWidth={2.5} className="text-marker-yellow" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
          <span className="text-xs font-sketch text-muted-foreground ml-auto">.{ext}</span>
        </div>
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-foreground leading-relaxed overflow-x-auto">
          {state.content}
        </pre>
      </div>
    );
  }

  // Video
  if (category === "video") {
    return (
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-dashed border-ink/20">
          <FileText size={18} strokeWidth={2.5} className="text-marker-blue" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <video
          src={fileUrl}
          controls
          className="w-full max-w-3xl mx-auto rounded-lg border-2 border-ink/10 shadow-sketch-sm"
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Audio
  if (category === "audio") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-dashed border-ink/20 w-full max-w-md">
          <FileText size={18} strokeWidth={2.5} className="text-marker-blue" />
          <span className="font-sketch text-sm text-foreground font-bold truncate">{fileName}</span>
        </div>
        <audio src={fileUrl} controls className="w-full max-w-md">
          Your browser does not support the audio tag.
        </audio>
      </div>
    );
  }

  // Unsupported fallback
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
      <FileText size={64} strokeWidth={1.5} className="text-muted-foreground/40" />
      <p className="text-xl font-sketch text-foreground">{fileName}</p>
      <p className="text-sm font-sketch text-muted-foreground">
        Preview not available for this file type
      </p>
      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
        <SketchyButton variant="default" size="sm" className="mt-2">
          <Download size={16} className="mr-2" />
          Open / Download File
        </SketchyButton>
      </a>
    </div>
  );
}

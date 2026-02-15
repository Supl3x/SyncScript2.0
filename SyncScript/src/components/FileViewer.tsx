import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import SketchyButton from "./SketchyButton";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface FileViewerProps {
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export default function FileViewer({ fileUrl, fileName, mimeType }: FileViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageNumber(1);
    setScale(1.0);
    setLoading(true);
    setError(null);
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error loading PDF:", error);
    setError("Failed to load PDF. Please try downloading the file.");
    setLoading(false);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle PDF files
  if (mimeType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf")) {
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="sketchy-border-sm bg-card p-2 mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SketchyButton variant="ghost" size="sm" onClick={goToPrevPage} disabled={pageNumber <= 1}>
              <ChevronLeft size={16} />
            </SketchyButton>
            <span className="text-sm font-sketch">
              Page {pageNumber} of {numPages || "?"}
            </span>
            <SketchyButton variant="ghost" size="sm" onClick={goToNextPage} disabled={pageNumber >= numPages}>
              <ChevronRight size={16} />
            </SketchyButton>
          </div>

          <div className="flex items-center gap-2">
            <SketchyButton variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
              <ZoomOut size={16} />
            </SketchyButton>
            <span className="text-sm font-sketch">{Math.round(scale * 100)}%</span>
            <SketchyButton variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
              <ZoomIn size={16} />
            </SketchyButton>
          </div>

          <SketchyButton variant="ghost" size="sm" onClick={handleDownload}>
            <Download size={16} />
          </SketchyButton>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-paper-dark/30 rounded-lg flex items-start justify-center p-4">
          {loading && (
            <div className="text-center py-8">
              <p className="font-sketch text-muted-foreground">Loading PDF...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-destructive mb-4" />
              <p className="font-sketch text-destructive mb-4">{error}</p>
              <SketchyButton onClick={handleDownload}>
                Download File
              </SketchyButton>
            </div>
          )}

          {!error && (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="text-center py-8">
                  <p className="font-sketch text-muted-foreground">Loading PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-sketch-lg"
              />
            </Document>
          )}
        </div>
      </div>
    );
  }

  // Handle Word documents (.doc, .docx)
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword" ||
    fileName.toLowerCase().endsWith(".docx") ||
    fileName.toLowerCase().endsWith(".doc")
  ) {
    // Use Microsoft Office Online Viewer for Word documents
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    
    return (
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="sketchy-border-sm bg-card p-2 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-marker-blue" />
            <span className="text-sm font-sketch truncate">{fileName}</span>
          </div>
          <SketchyButton variant="ghost" size="sm" onClick={handleDownload}>
            <Download size={16} />
          </SketchyButton>
        </div>

        {/* Word Viewer */}
        <div className="flex-1 overflow-hidden rounded-lg">
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        </div>
      </div>
    );
  }

  // Handle other file types (images, text, etc.)
  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex flex-col h-full">
        <div className="sketchy-border-sm bg-card p-2 mb-2 flex items-center justify-between">
          <span className="text-sm font-sketch truncate">{fileName}</span>
          <SketchyButton variant="ghost" size="sm" onClick={handleDownload}>
            <Download size={16} />
          </SketchyButton>
        </div>
        <div className="flex-1 overflow-auto bg-paper-dark/30 rounded-lg flex items-center justify-center p-4">
          <img src={fileUrl} alt={fileName} className="max-w-full max-h-full object-contain shadow-sketch-lg" />
        </div>
      </div>
    );
  }

  // Fallback for unsupported file types
  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      <FileText size={64} className="text-muted-foreground mb-4" />
      <p className="text-xl font-sketch text-foreground mb-2">{fileName}</p>
      <p className="text-sm font-sketch text-muted-foreground mb-4">
        Preview not available for this file type
      </p>
      <SketchyButton onClick={handleDownload}>
        <Download size={16} className="mr-2" />
        Download File
      </SketchyButton>
    </div>
  );
}

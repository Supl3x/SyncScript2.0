import { Pen, Eraser, StickyNote, Image, Move, MousePointer, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import BackButton from "@/components/BackButton";

const tools = [
  { icon: MousePointer, label: "Select" },
  { icon: Pen, label: "Pen" },
  { icon: Eraser, label: "Eraser" },
  { icon: StickyNote, label: "Sticky Note" },
  // { icon: Image, label: "Image" },
  // { icon: Move, label: "Pan" },
];

export default function WhiteboardPage() {
  const [activeTool, setActiveTool] = useState("Pen");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to parent container
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth * 2; // Retina support
      canvas.height = parent.clientHeight * 2;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
    }

    const context = canvas.getContext("2d");
    if (context) {
      context.scale(2, 2);
      context.lineCap = "round";
      context.strokeStyle = "hsl(220 15% 12%)"; // Ink color
      context.lineWidth = 3;
      contextRef.current = context;
    }

    // Initial content (optional, or leave blank)
  }, []);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (activeTool !== "Pen" && activeTool !== "Eraser") return;

    const { offsetX, offsetY } = nativeEvent;
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing) return;
    if (activeTool !== "Pen" && activeTool !== "Eraser") return;

    const { offsetX, offsetY } = nativeEvent;

    if (contextRef.current) {
      if (activeTool === "Eraser") {
        contextRef.current.globalCompositeOperation = "destination-out";
        contextRef.current.lineWidth = 20;
      } else {
        contextRef.current.globalCompositeOperation = "source-over";
        contextRef.current.strokeStyle = "hsl(220 15% 12%)";
        contextRef.current.lineWidth = 3;
      }

      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="animate-sketch-in h-[calc(100vh-3rem)] flex flex-col">
      <BackButton label="Back to Dashboard" />
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-sketch text-foreground">Whiteboard ✏️</h1>
          <p className="text-muted-foreground font-sketch">
            Sketch ideas and collaborate visually
          </p>
        </div>
        <button
          onClick={clearCanvas}
          className="flex items-center gap-2 text-sm font-sketch text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={16} />
          Clear Board
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative">
        {/* Floating toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="sketchy-border bg-card px-2 py-1.5 flex items-center gap-1">
            {tools.map((tool) => {
              const active = activeTool === tool.label;
              return (
                <button
                  key={tool.label}
                  onClick={() => setActiveTool(tool.label)}
                  title={tool.label}
                  className={`p-2 rounded-[155px_10px_145px_10px/10px_145px_10px_155px] transition-all ${active
                      ? "bg-marker-red/15 border-2 border-marker-red shadow-sketch-sm"
                      : "border-2 border-transparent hover:bg-paper-dark"
                    }`}
                >
                  <tool.icon
                    size={20}
                    strokeWidth={2.5}
                    className={active ? "text-marker-red" : "text-foreground"}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div className="sketchy-border bg-card h-full overflow-hidden relative cursor-crosshair">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={finishDrawing}
            onMouseMove={draw}
            onMouseLeave={finishDrawing}
            className="w-full h-full block touch-none"
          />

          {/* Helper text if canvas is empty (optional logic could be added) */}
          <div className="absolute bottom-4 right-4 pointer-events-none opacity-50">
            <span className="text-xs font-sketch text-muted-foreground">Drawing Mode: {activeTool}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

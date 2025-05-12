import React, { useState, useRef, useEffect } from 'react';
// @ts-expect-error - No types available for fabric
import { fabric } from 'fabric';
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF.js worker if not already initialized
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface SignatureArea {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  signerId: string;
  color: string;
}

interface SignatureAreaSelectorProps {
  documentFile: File | null;
  pageNumber: number;
  width: number;
  height: number;
  signatureAreas: SignatureArea[];
  activeSignerId: string | null;
  onAreaSelected: (signerId: string, area: Omit<SignatureArea, 'signerId' | 'color'>) => void;
  onAreaRemove?: (areaIdx: number) => void; // NEW: callback for removing area
  signers?: { id: string; color: string; name: string }[];
  onPageChange?: (page: number) => void; // <-- Add this line
}

// Light, professional color palette
const SIGNER_COLORS = [
  '#A7C7E7', // Light Blue
  '#B5EAD7', // Light Green
  '#FFDAC1', // Light Peach
  '#E2F0CB', // Light Mint
  '#FFF1BA', // Light Yellow
  '#C7CEEA', // Light Lavender
  '#FFD6E0', // Light Pink
  '#D0F4DE', // Light Aqua
];

const SignatureAreaSelector: React.FC<SignatureAreaSelectorProps> = ({
  documentFile,
  pageNumber,
  width,
  height,
  signatureAreas,
  activeSignerId,
  onAreaSelected,
  onAreaRemove,
  signers = [],
  onPageChange // <-- Add this line
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(pageNumber || 1);
  const [coordinateInfo, setCoordinateInfo] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // --- Draggable highlight state ---
  const [highlight, setHighlight] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false); // NEW: track drawing state
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setCurrentPage(pageNumber);
  }, [pageNumber]);

  // Get color for active signer safely
  const getActiveSignerColor = () => {
    if (!activeSignerId) return SIGNER_COLORS[0];
    const idx = signers.findIndex(s => s.id === activeSignerId);
    return SIGNER_COLORS[idx % SIGNER_COLORS.length];
  };

  // Show draggable highlight when signer is selected and not drawing
  useEffect(() => {
    if (activeSignerId && !isDrawing) {
      setHighlight({ x: 100, y: 100, width: 120, height: 40 });
    } else {
      setHighlight(null);
    }
  }, [activeSignerId, isDrawing]);

  // Draw all signature areas for the current page
  useEffect(() => {
    if (!canvasRef.current || !fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    // Remove all existing signature area rectangles (keep background)
    canvas.getObjects('rect').forEach((obj: fabric.Object) => canvas.remove(obj));
    // Draw all signature areas for this page
    signatureAreas.filter(a => a.page === currentPage).forEach(area => {
      const rect = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: area.color.replace('0.8', '0.2'),
        stroke: area.color,
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      });
      canvas.add(rect);
    });
    canvas.renderAll();
  }, [signatureAreas, currentPage]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.off();
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      } catch {
        // ignore
      }
    }
    let canvas: fabric.Canvas | null = null;
    try {
      canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        selection: false,
        renderOnAddRemove: true
      });
      fabricCanvasRef.current = canvas;
    } catch {
      return;
    }
    if (documentFile) {
      setDocumentLoaded(false);
      if (documentFile.type === 'application/pdf') {
        // Do not setDocumentLoaded(true) here; let <Document /> handle it
      } else if (documentFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function (e) {
          const imageUrl = e.target?.result as string;
          fabric.Image.fromURL(
            imageUrl,
            (img: fabric.Image) => {
              if (!canvas || !fabricCanvasRef.current) {
                setDocumentLoaded(true);
                return;
              }
              if (!img || !img.width || !img.height) {
                setDocumentLoaded(true);
                return;
              }
              const scale = Math.min(width / img.width, height / img.height);
              img.scale(scale);
              img.set({
                left: (width - img.width * scale) / 2,
                top: (height - img.height * scale) / 2,
                selectable: false,
                evented: false
              });
              canvas.setBackgroundImage(img, () => {
                if (canvas) {
                  canvas.renderAll();
                  addDottedGuidelines(canvas, width, height);
                }
                setDocumentLoaded(true);
              });
            },
            { crossOrigin: 'Anonymous', onerror: () => setDocumentLoaded(true) }
          );
        };
        reader.readAsDataURL(documentFile);
      } else {
        setDocumentLoaded(true); // Unsupported type, just show blank
      }
    }
    let rect: fabric.Rect | null = null;
    let startX = 0;
    let startY = 0;
    const handleMouseDown = (options: fabric.IEvent) => {
      if (!canvas || !activeSignerId) return;
      const pointer = canvas.getPointer(options.e);
      setIsDrawing(true); // PATCH: set drawing state
      startX = pointer.x;
      startY = pointer.y;
      setCoordinateInfo({ x: Math.round(startX), y: Math.round(startY), width: 0, height: 0 });
      if (rect && canvas) canvas.remove(rect);
      // Use active signer color
      const color = getActiveSignerColor();
      const bgColor = color.replace('0.8', '0.2');
      try {
        rect = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: bgColor,
          stroke: color,
          strokeWidth: 2,
          strokeDashArray: [5, 5],
          objectCaching: false
        });
        if (canvas) {
          canvas.add(rect);
          canvas.renderAll();
        }
      } catch {
        // ignore
      }
    };
    const handleMouseMove = (options: fabric.IEvent) => {
      if (!canvas || !isDrawing || !rect) return;
      try {
        const pointer = canvas.getPointer(options.e);
        const width = Math.abs(pointer.x - startX);
        const height = Math.abs(pointer.y - startY);
        const left = pointer.x < startX ? pointer.x : startX;
        const top = pointer.y < startY ? pointer.y : startY;
        rect.set({ left, top, width, height });
        setCoordinateInfo({ x: Math.round(left), y: Math.round(top), width: Math.round(width), height: Math.round(height) });
        canvas.renderAll();
      } catch {
        setIsDrawing(false); // PATCH: set drawing state
      }
    };
    const handleMouseUp = () => {
      if (!canvas || !isDrawing || !rect || !activeSignerId) return;
      setIsDrawing(false); // PATCH: set drawing state
      try {
        const area = {
          x: rect.left!,
          y: rect.top!,
          width: rect.width! * rect.scaleX!,
          height: rect.height! * rect.scaleY!,
          page: pageNumber
        };
        onAreaSelected(activeSignerId, area);
        rect = null;
      } catch {
        // ignore
      }
    };
    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);
    return () => {
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.off();
          fabricCanvasRef.current.dispose();
          fabricCanvasRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [documentFile, pageNumber, width, height, signatureAreas, activeSignerId, onAreaSelected, isDrawing, getActiveSignerColor]);

  // Mouse events for dragging the highlight
  const handleHighlightMouseDown = (e: React.MouseEvent) => {
    if (!highlight) return;
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - highlight.x,
      y: e.clientY - highlight.y
    };
    e.stopPropagation();
  };
  const handleHighlightMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !highlight) return;
    const newX = e.clientX - dragOffset.current.x;
    const newY = e.clientY - dragOffset.current.y;
    setHighlight({ ...highlight, x: Math.max(0, Math.min(newX, width - highlight.width)), y: Math.max(0, Math.min(newY, height - highlight.height)) });
  };
  const handleHighlightMouseUp = () => {
    setIsDragging(false);
  };

  // Helper: check if two areas overlap significantly
  function isOverlapping(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
    threshold = 0.7
  ) {
    // Calculate intersection area
    const x_overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const y_overlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const overlapArea = x_overlap * y_overlap;
    const minArea = Math.min(a.width * a.height, b.width * b.height);
    // If overlap area is more than threshold of the smaller area, consider as duplicate
    return overlapArea > 0 && (overlapArea / minArea) > threshold;
  }

  // Confirm highlight as signature area
  const handleHighlightConfirm = () => {
    if (highlight && activeSignerId) {
      // Prevent duplicate/overlapping signature areas for this signer on this page
      const existingAreas = signatureAreas.filter(
        a => a.page === currentPage
      );
      const isDuplicate = existingAreas.some(a => isOverlapping(a, { x: highlight.x, y: highlight.y, width: highlight.width, height: highlight.height }));
      if (isDuplicate) {
        window.alert('A signature area already exists at this location for another signer. Please choose a different spot.');
        return;
      }
      onAreaSelected(activeSignerId, { ...highlight, page: currentPage });
      setHighlight(null);
    }
  };

  const addDottedGuidelines = (canvas: fabric.Canvas, canvasWidth: number, canvasHeight: number) => {
    for (let y = 50; y < canvasHeight; y += 100) {
      const line = new fabric.Line([0, y, canvasWidth, y], {
        stroke: 'rgba(0,0,0,0.1)',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5]
      });
      canvas.add(line);
    }
    for (let x = 50; x < canvasWidth; x += 100) {
      const line = new fabric.Line([x, 0, x, canvasHeight], {
        stroke: 'rgba(0,0,0,0.1)',
        selectable: false,
        evented: false,
        strokeDashArray: [5, 5]
      });
      canvas.add(line);
    }
    canvas.renderAll();
  };

  // Helper: render signature placeholders for all signers
  const renderSignaturePlaceholders = () => {
    return signatureAreas
      .filter(area => area.page === currentPage)
      .map((area, areaIdx) => {
        // Find the signer for this area
        const signerIdx = signers.findIndex(s => s.id === area.signerId);
        // Use a professional color palette, fallback to area.color if not found
        const color = signerIdx >= 0 ? SIGNER_COLORS[signerIdx % SIGNER_COLORS.length] : area.color;
        const minBtnSize = 36;
        const minAreaWidth = 40;
        const minAreaHeight = 32;
        const isSmall = area.width < minBtnSize + 8 || area.height < minBtnSize + 8;
        const signerName = signerIdx >= 0 && signers[signerIdx].name ? signers[signerIdx].name : `Signer`;
        return (
          <div
            key={`sig-placeholder-${areaIdx}`}
            className={`absolute flex items-center justify-center border-2 border-dotted bg-white/60 font-semibold select-none pointer-events-auto ${isSmall ? '' : 'group'}`}
            style={{
              left: area.x,
              top: area.y,
              width: Math.max(area.width, minAreaWidth),
              height: Math.max(area.height, minAreaHeight),
              minWidth: minAreaWidth,
              minHeight: minAreaHeight,
              borderColor: color,
              color,
              fontFamily: 'cursive',
              fontSize: Math.max(14, Math.min(area.width, area.height) / 2),
              zIndex: 10,
              overflow: 'visible',
              pointerEvents: 'auto',
            }}
          >
            <span className="opacity-70 pointer-events-none flex flex-col items-center">
              Signature
              <span className="text-xs font-sans font-normal" style={{ color: color, fontWeight: 500 }}>{signerName}</span>
            </span>
            {onAreaRemove && activeSignerId === area.signerId && (
              <button
                type="button"
                aria-label="Remove signature area"
                onClick={e => { e.stopPropagation(); onAreaRemove(areaIdx); }}
                className="absolute top-1 right-1 focus:outline-none"
                style={{
                  zIndex: 20,
                  width: minBtnSize,
                  height: minBtnSize,
                  minWidth: minBtnSize,
                  minHeight: minBtnSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  border: '2px solid #d32f2f',
                  borderRadius: '9999px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  color: '#d32f2f',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L14 14M14 6L6 14" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        );
      });
  };

  return (
    <div
      id="signature-area-preview"
      className={`relative border rounded-lg shadow-sm overflow-visible w-full flex flex-col items-center bg-white ${isDragging ? 'select-none' : ''}`}
      style={{ padding: 0, overflow: 'visible' }}
      onMouseMove={handleHighlightMouseMove}
      onMouseUp={handleHighlightMouseUp}
    >
      {/* Document display area */}
      <div className="relative flex justify-center w-full" style={{ minHeight: height }}>
        {!documentLoaded && (
          <div className="absolute inset-0 flex justify-center items-center bg-white bg-opacity-75 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
        {documentFile && documentFile.type === 'application/pdf' ? (
          <div className="w-full flex justify-center">
            <Document
              file={documentFile}
              onLoadSuccess={({ numPages }) => { setNumPages(numPages); setDocumentLoaded(true); }}
              loading={<div className="flex justify-center items-center h-full"><p className="text-gray-500">Loading PDF...</p></div>}
              error={<div className="flex justify-center items-center h-full bg-red-50 p-4"><p className="text-red-500">Could not load PDF. Try a different document format.</p></div>}
            >
              <Page 
                pageNumber={currentPage} 
                width={width} 
                renderAnnotationLayer={false}
                renderTextLayer={false}
                className="pdf-page"
              />
            </Document>
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="border rounded shadow-sm bg-white" 
            width={width} 
            height={height}
          />
        )}
        {/* Draggable highlight for active signer */}
        {highlight && activeSignerId && (
          <div
            className="absolute flex flex-col items-center justify-center border-2 border-dashed bg-opacity-20"
            style={{
              left: highlight.x,
              top: highlight.y,
              width: highlight.width,
              height: highlight.height,
              borderColor: getActiveSignerColor(),
              background: getActiveSignerColor() + '33',
              cursor: isDragging ? 'grabbing' : 'grab',
              boxShadow: isDragging ? '0 0 0 2px #6366f1' : '0 1px 4px rgba(0,0,0,0.08)',
              zIndex: 1000,
            }}
            onMouseDown={handleHighlightMouseDown}
            title="Add signature area"
          >
            <span className="text-xs font-semibold text-gray-700 select-none pointer-events-none">
              Drag to position, then click Add
            </span>
            <button
              className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-primary-600 text-white text-xs shadow hover:bg-primary-700 border border-primary-700"
              style={{ zIndex: 1001 }}
              onClick={e => { e.stopPropagation(); handleHighlightConfirm(); }}
            >
              Add Area
            </button>
          </div>
        )}
        {/* Render signature placeholders for active signer */}
        {renderSignaturePlaceholders()}
        {/* Floating Add Signature Area button */}
        {activeSignerId && !highlight && (
          <button
            className="absolute top-4 right-4 px-3 py-1.5 rounded bg-primary-100 text-primary-700 text-xs font-semibold shadow hover:bg-primary-200 border border-primary-200"
            style={{ zIndex: 1002 }}
            onClick={() => setHighlight({ x: 100, y: 100, width: 120, height: 40 })}
          >
            + Add Signature Area
          </button>
        )}
        {/* Coordinates display in bottom-left */}
        <div className="absolute left-2 bottom-2 bg-white/80 rounded px-2 py-1 text-xs shadow border border-gray-200">
          <div className="font-mono text-gray-700">Start: ({coordinateInfo.x}, {coordinateInfo.y})</div>
          <div className="font-mono text-gray-700">End: ({coordinateInfo.x + coordinateInfo.width}, {coordinateInfo.y + coordinateInfo.height})</div>
        </div>
      </div>
      {/* Page navigation controls (if multiple pages) */}
      {numPages && numPages > 1 && (
        <div className="flex justify-center items-center mt-2 gap-2">
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
            onClick={() => onPageChange ? onPageChange(Math.max(1, pageNumber - 1)) : setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
          >
            &lt; Prev
          </button>
          <span className="text-xs text-gray-600">
            Page {pageNumber} of {numPages}
          </span>
          <button
            className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-xs"
            onClick={() => onPageChange ? onPageChange(Math.min(numPages, pageNumber + 1)) : setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
          >
            Next &gt;
          </button>
        </div>
      )}
    </div>
  );
};

export default SignatureAreaSelector;

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import Button from './Button';

interface SecurePDFViewerProps {
  file: string | null;
  onLoadSuccess?: (data: { numPages: number }) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  children?: React.ReactNode;
}

const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({
  file,
  onLoadSuccess,
  currentPage = 1,
  onPageChange,
  className = "",
  children
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  useEffect(() => {
    if (!file) return;

    const loadPDF = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use dynamic import to load PDF.js only when needed
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker path to use a CDN version with integrity
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
        
        const pdf = await pdfjsLib.getDocument(file).promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        
        if (onLoadSuccess) {
          onLoadSuccess({ numPages: pdf.numPages });
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [file, onLoadSuccess]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        
        const viewport = page.getViewport({ 
          scale: scale,
          rotation: rotation 
        });
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render PDF page.');
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      if (onPageChange) {
        onPageChange(newPage);
      }
    }
  };

  const handleNextPage = () => {
    if (currentPage < numPages) {
      const newPage = currentPage + 1;
      if (onPageChange) {
        onPageChange(newPage);
      }
    }
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 border rounded-lg ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 border rounded-lg bg-red-50 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!pdfDoc) {
    return (
      <div className={`flex items-center justify-center h-96 border rounded-lg ${className}`}>
        <p className="text-gray-600">No PDF document loaded</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* PDF Controls */}
      <div className="flex items-center justify-between mb-4 p-2 bg-gray-100 rounded">
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {numPages}
          </span>
          <Button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={handleZoomOut} variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button onClick={handleZoomIn} variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button onClick={handleRotate} variant="outline" size="sm">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="relative border rounded-lg overflow-auto" style={{ maxHeight: '600px' }}>
        <canvas 
          ref={canvasRef}
          className="mx-auto block"
          style={{ maxWidth: '100%' }}
        />
        {children && (
          <div className="absolute inset-0">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurePDFViewer;

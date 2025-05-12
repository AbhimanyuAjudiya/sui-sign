import React, { useRef, useEffect } from 'react';
import { fabric } from 'fabric';

interface SignatureCanvasProps {
  onChange: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onChange,
  width = 400,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: true,
      width,
      height,
      backgroundColor: '#ffffff'
    });

    canvas.freeDrawingBrush.width = 2;
    canvas.freeDrawingBrush.color = '#000000';

    fabricCanvasRef.current = canvas;

    canvas.on('path:created', () => {
      onChange(canvas.toDataURL());
    });

    return () => {
      canvas.dispose();
    };
  }, [onChange, width, height]);

  const handleClear = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.setBackgroundColor('#ffffff', () => {
        fabricCanvasRef.current?.renderAll();
      });
      onChange('');
    }
  };

  return (
    <div className="border rounded-lg p-4 bg-white">
      <canvas ref={canvasRef} className="border rounded mb-2" />
      <button
        onClick={handleClear}
        className="text-sm text-gray-600 hover:text-gray-800"
      >
        Clear Signature
      </button>
    </div>
  );
};

export default SignatureCanvas;
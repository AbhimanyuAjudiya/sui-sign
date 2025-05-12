import React, { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  label?: string;
  selectedFile?: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelected,
  accept = '.pdf,.doc,.docx',
  maxSize = 10 * 1024 * 1024, // 10MB
  label = 'Upload Document',
  selectedFile = null,
}) => {
  const [file, setFile] = useState<File | null>(selectedFile);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    if (selectedFile.size > maxSize) {
      setError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    onFileSelected(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const droppedFile = e.dataTransfer.files?.[0];
    
    if (!droppedFile) return;
    
    if (droppedFile.size > maxSize) {
      setError(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
      return;
    }
    
    setFile(droppedFile);
    setError(null);
    onFileSelected(droppedFile);
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full">
      {file ? (
        <div className="border rounded-md p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              icon={<X size={16} />}
              aria-label="Remove file"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-md p-6 text-center ${
            error ? 'border-error-300 bg-error-50' : 'border-gray-300 hover:border-primary-400'
          } transition-colors cursor-pointer`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="space-y-2">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-base font-medium text-gray-900">{label}</p>
              <p className="text-sm text-gray-500">
                Drag and drop, or click to select
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Max size: {maxSize / (1024 * 1024)}MB
              </p>
            </div>
            {error && <p className="text-sm text-error-600">{error}</p>}
          </div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={accept}
            onChange={handleFileChange}
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
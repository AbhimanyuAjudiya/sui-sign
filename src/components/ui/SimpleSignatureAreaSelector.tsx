import React, { useState } from 'react';
import { FileText, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';

interface SignatureArea {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  signerId: string;
  color: string;
}

interface Signer {
  id: string;
  name: string;
  color: string;
}

interface SimpleSignatureAreaSelectorProps {
  documentUrl?: string;
  documentFile?: File | null;
  signatureAreas: SignatureArea[];
  onAreaSelected: (signerId: string, area: { x: number; y: number; width: number; height: number; page: number }) => void;
  signers: Signer[];
}

const SimpleSignatureAreaSelector: React.FC<SimpleSignatureAreaSelectorProps> = ({
  documentUrl,
  documentFile,
  signatureAreas,
  onAreaSelected,
  signers
}) => {
  const [selectedSigner, setSelectedSigner] = useState(signers[0]?.id || '');
  const [newArea, setNewArea] = useState({
    page: 1,
    x: 100,
    y: 100,
    width: 200,
    height: 50
  });

  const addSignatureArea = () => {
    onAreaSelected(selectedSigner, newArea);
  };

  const hasDocument = documentUrl || documentFile;

  return (
    <div className="space-y-6">
      {/* Document Display */}
      <div className="border rounded-lg overflow-hidden bg-gray-50">
        {hasDocument ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Document Loaded</h3>
            <p className="text-gray-600 mb-4">
              Document is ready for signature area placement. Use the controls below to add signature areas.
            </p>
            {documentFile && (
              <p className="text-sm text-gray-500">File: {documentFile.name}</p>
            )}
            {documentUrl && (
              <p className="text-sm text-gray-500">URL: {documentUrl}</p>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <FileText className="mx-auto h-16 w-16 mb-4" />
            <p>Upload a document to begin placing signature areas</p>
          </div>
        )}
      </div>

      {/* Signature Area Controls */}
      {hasDocument && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Add Signature Areas</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Signer</label>
              <select
                value={selectedSigner}
                onChange={(e) => setSelectedSigner(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              >
                {signers.map((signer) => (
                  <option key={signer.id} value={signer.id}>
                    {signer.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Page</label>
              <Input
                type="number"
                min="1"
                value={newArea.page}
                onChange={(e) => setNewArea({ ...newArea, page: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">X Position</label>
              <Input
                type="number"
                value={newArea.x}
                onChange={(e) => setNewArea({ ...newArea, x: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Y Position</label>
              <Input
                type="number"
                value={newArea.y}
                onChange={(e) => setNewArea({ ...newArea, y: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Width</label>
              <Input
                type="number"
                value={newArea.width}
                onChange={(e) => setNewArea({ ...newArea, width: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Height</label>
              <Input
                type="number"
                value={newArea.height}
                onChange={(e) => setNewArea({ ...newArea, height: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <Button onClick={addSignatureArea} disabled={!selectedSigner}>
            <Plus className="h-4 w-4 mr-2" />
            Add Signature Area
          </Button>
        </div>
      )}

      {/* Signature Areas List */}
      {signatureAreas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Signature Areas</h3>
          <div className="space-y-2">
            {signatureAreas.map((area, index) => {
              const signer = signers.find(s => s.id === area.signerId);
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{signer?.name || 'Unknown Signer'}</p>
                    <p className="text-sm text-gray-600">
                      Page {area.page} • Position: ({area.x}, {area.y}) • Size: {area.width}×{area.height}
                    </p>
                  </div>
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: area.color }}
                    title="Signature area color"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleSignatureAreaSelector;

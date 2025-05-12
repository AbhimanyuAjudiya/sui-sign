import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import FileUpload from '../components/ui/FileUpload';
import SignatureAreaSelector from '../components/ui/SignatureAreaSelector';
import { useUser } from '../context/UserContext';
import { uploadFileToWalrus, createAgreement } from '../utils/suiClient';
import { UserPlus, Trash2, X, UserCircle2 } from 'lucide-react';

// Update the type of signatureAreas in the Signer interface to allow signerId and color
interface Signer {
  id: string;
  email: string;
  name: string;
  color: string;
  address?: string; // NEW: public address for label
  signatureAreas: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    signerId?: string;
    color?: string;
  }[];
}

const Upload: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [signers, setSigners] = useState<Signer[]>([
    {
      id: Date.now().toString(),
      email: '',
      name: 'Signer 1',
      color: 'rgba(75, 85, 255, 0.8)',
      signatureAreas: []
    }
  ]);
  const [activeSignerIndex, setActiveSignerIndex] = useState(0);

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    if (!file) {
      newErrors.file = 'Please upload a document';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    if (!user || !file) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const fileHash = await uploadFileToWalrus(file);
      
      const agreementId = await createAgreement(
        title,
        description,
        fileHash,
        user.address
      );
      
      navigate(`/agreement/${agreementId}`);
    } catch (error) {
      console.error('Error creating agreement:', error);
      setErrors({
        submit: 'Failed to create agreement. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSigner = () => {
    const newSignerIndex = signers.length + 1;
    setSigners([
      ...signers,
      {
        id: Date.now().toString(),
        email: '',
        name: `Signer ${newSignerIndex}`,
        color: getRandomColor(),
        signatureAreas: []
      }
    ]);
    setActiveSignerIndex(signers.length);
  };

  const getRandomColor = () => {
    const colors = [
      'rgba(75, 85, 255, 0.8)',
      'rgba(220, 38, 38, 0.8)',
      'rgba(5, 150, 105, 0.8)',
      'rgba(236, 72, 153, 0.8)',
      'rgba(234, 88, 12, 0.8)',
      'rgba(109, 40, 217, 0.8)'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleRemoveSigner = (id: string) => {
    if (signers.length <= 1) return;
    const newSigners = signers.filter(signer => signer.id !== id);
    setSigners(newSigners);
    if (activeSignerIndex >= newSigners.length) {
      setActiveSignerIndex(newSigners.length - 1);
    }
  };

  // Helper: check if two areas overlap (not just touch)
  function isOverlapping(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    // Calculate intersection area
    const x_overlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const y_overlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    const overlapArea = x_overlap * y_overlap;
    // Only block if there is actual overlap (not just touching edges)
    return overlapArea > 0;
  }

  const handleSignatureAreaSelected = (signerId: string, area: { x: number; y: number; width: number; height: number; page: number }) => {
    if (area.width < 10 || area.height < 10) return;
    // Prevent duplicate/overlapping signature areas for any signer on this page
    const allAreas = signers.flatMap(s => s.signatureAreas.map(a => ({ ...a, signerId: s.id })));
    const isDuplicate = allAreas.some(a => a.page === area.page && isOverlapping(a, area));
    if (isDuplicate) {
      window.alert('A signature area already exists at this location. Please choose a different spot.');
      return;
    }
    const updatedSigners = [...signers];
    const signerIndex = updatedSigners.findIndex(s => s.id === signerId);
    if (signerIndex === -1) return;
    updatedSigners[signerIndex].signatureAreas.push({
      x: Math.round(area.x),
      y: Math.round(area.y),
      width: Math.round(area.width),
      height: Math.round(area.height),
      page: area.page,
      signerId,
      color: updatedSigners[signerIndex].color
    });
    setSigners(updatedSigners);
  };

  const handleRemoveSignatureArea = (signerIndex: number, areaIndex: number) => {
    const updatedSigners = [...signers];
    updatedSigners[signerIndex].signatureAreas.splice(areaIndex, 1);
    setSigners(updatedSigners);
  };

  const handleSignerEmailChange = (index: number, email: string) => {
    const updatedSigners = [...signers];
    updatedSigners[index].email = email;
    setSigners(updatedSigners);
  };

  type SignatureArea = {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
    signerId: string;
    color: string;
  };

  const getSignatureAreasForPage = (page: number): SignatureArea[] => {
    return signers.flatMap(signer =>
      signer.signatureAreas
        .filter(area => area.page === page)
        .map(area => ({ ...area, signerId: signer.id, color: signer.color }))
    );
  };

  return (
    <PageContainer title="Create New Agreement">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit}>
            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter agreement title"
              error={errors.title}
              required
            />
            
            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this agreement"
              rows={4}
              error={errors.description}
              required
            />
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document
              </label>
              <FileUpload
                onFileSelected={setFile}
                accept=".pdf,.doc,.docx,.txt"
                selectedFile={file}
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Make this agreement public</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Public agreements can be viewed by anyone with the link
              </p>
            </div>
            
            {file && (
              <div className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-md font-medium text-gray-900">Signers</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSigner}
                        icon={<UserPlus size={16} />}
                      >
                        Add Signer
                      </Button>
                    </div>
                    {signers.map((signer, index) => (
                      <div key={signer.id} className={`p-3 mb-2 border rounded-md ${index === activeSignerIndex ? 'border-primary-300 bg-primary-50' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <button
                            className="text-sm font-medium text-gray-800 hover:text-primary-600 text-left flex-grow"
                            onClick={() => setActiveSignerIndex(index)}
                          >
                            <div style={{ color: signer.color }} className="flex items-center">
                              <UserCircle2 size={16} className="mr-1" />
                              {signer.name}
                            </div>
                          </button>
                          {signers.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSigner(signer.id)}
                              aria-label="Remove signer"
                            >
                              <Trash2 size={16} className="text-gray-500" />
                            </Button>
                          )}
                        </div>
                        <Input
                          placeholder="Email or Sui address"
                          value={signer.email}
                          onChange={e => handleSignerEmailChange(index, e.target.value)}
                          className="mb-2"
                        />
                        {index === activeSignerIndex && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-700 mb-1 font-medium">
                                Signature Areas: {signer.signatureAreas.length}
                              </p>
                              {signer.signatureAreas.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {signer.signatureAreas.length} {signer.signatureAreas.length === 1 ? 'area' : 'areas'} defined
                                </span>
                              )}
                            </div>
                            {signer.signatureAreas.length > 0 ? (
                              <div className="max-h-32 overflow-y-auto border rounded p-2 mb-2 bg-gray-50">
                                {signer.signatureAreas.map((area, areaIdx) => (
                                  <div key={areaIdx} className="flex justify-between items-center p-1 text-xs border-b last:border-b-0 hover:bg-gray-100">
                                    <span style={{ color: signer.color }}>
                                      Page {area.page}, Position: ({Math.round(area.x)}, {Math.round(area.y)})
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveSignatureArea(index, areaIdx)}
                                      aria-label="Remove area"
                                      className="h-6 w-6 p-0 flex items-center justify-center"
                                    >
                                      <X size={12} className="text-gray-500" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="border border-dashed border-gray-300 rounded p-2 mb-2 text-center bg-gray-50">
                                <p className="text-xs text-gray-500">No signature areas defined yet</p>
                              </div>
                            )}
                            <p className="text-xs text-gray-500">
                              <span className="inline-block bg-gray-100 rounded px-1 py-0.5 text-gray-700 mr-1">Tip:</span>
                              Select your signer, then on the document, click and drag to draw signature areas.
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="md:col-span-2 border rounded-lg p-4">
                    <SignatureAreaSelector
                      documentFile={file}
                      pageNumber={1}
                      width={700}
                      height={900}
                      signatureAreas={getSignatureAreasForPage(1)}
                      activeSignerId={signers[activeSignerIndex]?.id || null}
                      onAreaSelected={handleSignatureAreaSelected}
                      onAreaRemove={areaIdx => handleRemoveSignatureArea(activeSignerIndex, areaIdx)}
                      signers={signers.map(s => ({ id: s.id, name: s.name, color: s.color }))}
                      key={signers.map(s => s.signatureAreas.map(a => `${a.x},${a.y},${a.width},${a.height}`).join('|')).join(';')}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {errors.submit && (
              <div className="mb-4 p-3 bg-error-50 text-error-700 rounded-md text-sm">
                {errors.submit}
              </div>
            )}
            
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="mr-3"
                onClick={() => navigate('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                icon={<Save size={16} />}
              >
                Save as Draft
              </Button>
            </div>
          </form>
        </div>
        {/* Preview area for when no file is selected */}
        {!file && (
          <div className="flex flex-col items-center justify-center h-64 py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 mt-8">
            <p className="mt-2 text-sm text-gray-500">Upload a PDF, DOC, or DOCX file to define signature areas</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default Upload;
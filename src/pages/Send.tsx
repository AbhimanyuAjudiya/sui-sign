import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Search, Send as SendIcon, Upload, FileText, X, Trash2, UserPlus, UserCircle2 } from 'lucide-react';
import { resolveDocumentUrl, isWalrusBlob } from '../utils/resolveWalrusUrl';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import FileUpload from '../components/ui/FileUpload';
import SignatureAreaSelector from '../components/ui/SimpleSignatureAreaSelector';
import { Agreement, AgreementStatus } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementsForUser, sendAgreement, createAgreement, uploadFileToWalrus } from '../utils/suiClient';
import { resolveGmailToSuiAddress } from '../utils/zkLogin';

// Define the interface for a signer
interface Signer {
  id: string;
  email: string;
  name: string;
  color: string;
  signatureAreas: {
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
  }[];
}

const Send: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  // States for tab management
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
  
  // States for existing agreements flow
  const [draftAgreements, setDraftAgreements] = useState<Agreement[]>([]);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for new agreement flow
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string>('');
  
  // States for signers (recipients)
  const [signers, setSigners] = useState<Signer[]>([{ 
    id: Date.now().toString(), 
    email: '',
    name: 'Signer 1',
    color: 'rgba(75, 85, 255, 0.8)',
    signatureAreas: [] 
  }]);
  const [activeSignerIndex, setActiveSignerIndex] = useState(0);
  
  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add currentPage state for document navigation
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const loadDraftAgreements = async () => {
      try {
        setIsLoading(true);
        const userAgreements = await fetchAgreementsForUser(user.address);
        const drafts = userAgreements.filter(
          a => a.status === AgreementStatus.DRAFT && a.creator === user.address
        );
        setDraftAgreements(drafts);
      } catch (error) {
        // console.error('Error fetching draft agreements:', error);
        setError('Failed to fetch draft agreements. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDraftAgreements();
  }, [user, navigate]);
  
  // Filter drafts based on search term
  const filteredDrafts = draftAgreements.filter(draft => 
    draft.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    draft.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle adding a new signer
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

  // Generate a random color for a signer
  const getRandomColor = () => {
    const colors = [
      'rgba(75, 85, 255, 0.8)',  // Blue
      'rgba(220, 38, 38, 0.8)',  // Red
      'rgba(5, 150, 105, 0.8)',  // Green
      'rgba(236, 72, 153, 0.8)', // Pink
      'rgba(234, 88, 12, 0.8)',  // Orange
      'rgba(109, 40, 217, 0.8)'  // Purple
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Handle removing a signer
  const handleRemoveSigner = (id: string) => {
    if (signers.length <= 1) return; // Keep at least one signer
    
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

  // Handle signature area selection
  const handleSignatureAreaSelected = (signerId: string, area: { x: number; y: number; width: number; height: number; page: number }) => {
    try {
      // Validate area dimensions
      if (area.width < 10 || area.height < 10) {
        // console.warn("Signature area too small, ignoring", area);
        return;
      }
      
      // Prevent duplicate/overlapping signature areas for any signer on this page
      const allAreas = signers.flatMap(s => s.signatureAreas.map(a => ({ ...a, signerId: s.id })));
      const isDuplicate = allAreas.some(a => a.page === area.page && isOverlapping(a, area));
      if (isDuplicate) {
        window.alert('A signature area already exists at this location. Please choose a different spot.');
        return;
      }

      const updatedSigners = [...signers];
      const signerIndex = updatedSigners.findIndex(s => s.id === signerId);
      
      if (signerIndex === -1) {
        // console.error("Signer not found with ID:", signerId);
        return;
      }
      
      // Create a clean copy of the area to avoid reference issues
      const areaToAdd = {
        x: Math.round(area.x),
        y: Math.round(area.y),
        width: Math.round(area.width),
        height: Math.round(area.height),
        page: area.page
      };
      
      updatedSigners[signerIndex].signatureAreas.push(areaToAdd);
      setSigners(updatedSigners);
    } catch (error) {
      // console.error("Error adding signature area:", error);
      setError('Could not add signature area. Please try again.');
    }
  };
  
  // Handle removing a signature area
  const handleRemoveSignatureArea = (signerIndex: number, areaIndex: number) => {
    if (signerIndex < 0 || signerIndex >= signers.length) {
      // console.error("Invalid signer index:", signerIndex);
      return;
    }
    
    try {
      const updatedSigners = [...signers];
      const signerAreas = updatedSigners[signerIndex].signatureAreas;
      
      if (areaIndex < 0 || areaIndex >= signerAreas.length) {
        // console.error("Invalid area index:", areaIndex);
        return;
      }
      
      updatedSigners[signerIndex].signatureAreas = [
        ...signerAreas.slice(0, areaIndex),
        ...signerAreas.slice(areaIndex + 1)
      ];
      
      setSigners(updatedSigners);
    } catch (error) {
      // console.error("Error removing signature area:", error);
      setError('Could not remove signature area.');
    }
  };
  
  // Handle signer email change
  const handleSignerEmailChange = (index: number, email: string) => {
    const updatedSigners = [...signers];
    updatedSigners[index].email = email;
    setSigners(updatedSigners);
  };
  
  // Validate before sending
  const validate = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (activeTab === 'new') {
      if (!title.trim()) {
        errors.title = 'Title is required';
      }
      
      if (!description.trim()) {
        errors.description = 'Description is required';
      }
      
      if (!file) {
        errors.file = 'Please upload a document';
      }
      
      if (!expiryDate) {
        errors.expiryDate = 'Please select an expiry date';
      } else {
        const selectedDate = new Date(expiryDate);
        const today = new Date();
        
        if (selectedDate <= today) {
          errors.expiryDate = 'Expiry date must be in the future';
        }
      }
    } else {
      if (!selectedAgreement) {
        errors.agreement = 'Please select an agreement';
      }
      
      if (!expiryDate) {
        errors.expiryDate = 'Please select an expiry date';
      } else {
        const selectedDate = new Date(expiryDate);
        const today = new Date();
        
        if (selectedDate <= today) {
          errors.expiryDate = 'Expiry date must be in the future';
        }
      }
    }
    
    // Validate signers
    const hasEmptyEmail = signers.some(signer => !signer.email.trim());
    if (hasEmptyEmail) {
      errors.signers = 'All signers must have an email or Sui address';
    }
    
    // Validate each signer has at least one signature area
    const hasEmptySignatureArea = signers.some(signer => signer.signatureAreas.length === 0);
    if (hasEmptySignatureArea) {
      errors.signatureAreas = 'Each signer must have at least one signature area';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle uploading a new agreement
  const handleUploadAndCreate = async () => {
    if (!validate() || !file || !user) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      // Upload file to storage
      const fileHash = await uploadFileToWalrus(file);
      
      // Create agreement
      const agreementId = await createAgreement(
        title,
        description,
        fileHash,
        user.address,
        expiryDate
      );
      
      // Add signers and signature areas
      // Collect all signature areas for all signers
      let allSignatureAreas: any[] = [];
      let allRecipients: string[] = [];

      for (const signer of signers) {
        let recipientAddress = signer.email;
        if (signer.email.includes('@')) {
          const resolvedAddress = await resolveGmailToSuiAddress(signer.email);
          if (!resolvedAddress) {
            setError(`Could not resolve email to a Sui address: ${signer.email}`);
            setIsUploading(false);
            return;
          }
          recipientAddress = resolvedAddress;
        }
        allRecipients.push(recipientAddress);

        const signatureAreas = signer.signatureAreas.map(area => ({
          signer: recipientAddress,
          page: area.page,
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          inputType: 0,
          value: [],
          signed: false,
          rejected: false
        }));
        allSignatureAreas = [...allSignatureAreas, ...signatureAreas];
      }

      // Send agreement to add signature areas
      if (allSignatureAreas.length > 0) {
        const success = await sendAgreement(
          agreementId,
          allRecipients[0], // Use first recipient as main recipient for legacy compatibility
          user.address,
          expiryDate,
          allSignatureAreas
        );
        
        if (!success) {
          setError('Failed to add signers to agreement.');
          setIsUploading(false);
          return;
        }
      }
      
      // console.log('Created agreement with signers:', signers);
      
      navigate(`/agreement/${agreementId}`);
    } catch (error) {
      // console.error('Error creating agreement:', error);
      setError('Failed to create agreement. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Handle sending an existing agreement
  const handleSendExisting = async () => {
    if (!validate() || !selectedAgreement || !user) return;

    setIsSending(true);
    setError(null);

    try {
      // Collect all signature areas for all signers
      let allSignatureAreas: any[] = [];
      let allRecipients: string[] = [];

      for (const signer of signers) {
        let recipientAddress = signer.email;
        if (signer.email.includes('@')) {
          const resolvedAddress = await resolveGmailToSuiAddress(signer.email);
          if (!resolvedAddress) {
            setError(`Could not resolve email to a Sui address: ${signer.email}`);
            setIsSending(false);
            return;
          }
          recipientAddress = resolvedAddress;
        }
        allRecipients.push(recipientAddress);

        const signatureAreas = signer.signatureAreas.map(area => ({
          signer: recipientAddress,
          page: area.page,
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          inputType: 0,
          value: [],
          signed: false,
          rejected: false
        }));
        allSignatureAreas = [...allSignatureAreas, ...signatureAreas];
      }

      // Send agreement once, with all recipients and all signature areas
      // Use the first recipient as the main recipient for legacy compatibility
      const success = await sendAgreement(
        selectedAgreement.id,
        allRecipients[0],
        user.address,
        expiryDate,
        allSignatureAreas
      );

      if (!success) {
        setError(`Failed to send agreement. Please try again.`);
        setIsSending(false);
        return;
      }

      navigate('/dashboard');
    } catch (error) {
      // console.error('Error sending agreement:', error);
      setError('An error occurred while sending the agreement.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = () => {
    if (activeTab === 'new') {
      handleUploadAndCreate();
    } else {
      handleSendExisting();
    }
  };

  // Helper to flatten all signature areas for the current page
  const getSignatureAreasForPage = (page: number) => {
    return signers.flatMap(signer =>
      signer.signatureAreas
        .filter(area => area.page === page)
        .map(area => ({ ...area, signerId: signer.id, color: signer.color }))
    );
  };
  
  return (
    <PageContainer title="Send Agreement for Signature">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <div className="flex space-x-2">
              <button
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'existing'
                    ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 border-b border-gray-200'
                }`}
                onClick={() => setActiveTab('existing')}
              >
                Use Existing Draft
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
                  activeTab === 'new'
                    ? 'bg-white text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 border-b border-gray-200'
                }`}
                onClick={() => setActiveTab('new')}
              >
                Create New Document
              </button>
            </div>
          </div>
          
          {isLoading && activeTab === 'existing' ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : draftAgreements.length === 0 && activeTab === 'existing' ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No draft agreements</h3>
              <p className="text-gray-500 mb-6">You need to create a draft agreement before you can send it.</p>
              <Button
                variant="primary"
                onClick={() => setActiveTab('new')}
              >
                Create New Agreement
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Column: Agreement Selection or Creation */}
              <div className="lg:col-span-1">
                {activeTab === 'existing' ? (
                  <>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Input
                          placeholder="Search drafts..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {}}
                          aria-label="Search"
                        >
                          <Search className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                        {filteredDrafts.map((agreement) => (                            <div
                            key={agreement.id}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedAgreement?.id === agreement.id
                                ? 'bg-primary-50 border border-primary-200'
                                : 'hover:bg-gray-50 border border-transparent'
                            }`}
                            onClick={() => {
                              setSelectedAgreement(agreement);
                              // Set expiry date from agreement if available, otherwise default to 30 days from now
                              if (agreement.expiresAt) {
                                const expiryDate = new Date(agreement.expiresAt);
                                // Only set if it's in the future
                                if (expiryDate > new Date()) {
                                  setExpiryDate(expiryDate.toISOString().split('T')[0]);
                                }
                              }
                            }}
                          >
                            <h3 className="font-medium">{agreement.title}</h3>
                            <p className="text-sm text-gray-500 truncate">{agreement.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-4 mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-error-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          validationErrors.expiryDate ? 'border-error-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        min={new Date().toISOString().split('T')[0]} 
                        required
                      />
                      {validationErrors.expiryDate && (
                        <p className="mt-1 text-sm text-error-600">{validationErrors.expiryDate}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        The agreement will expire on this date if not signed by all parties.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <Input
                        label="Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter agreement title"
                        error={validationErrors.title}
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <TextArea
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the purpose of this agreement"
                        rows={3}
                        error={validationErrors.description}
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date <span className="text-error-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className={`w-full px-3 py-2 border ${
                          validationErrors.expiryDate ? 'border-error-300' : 'border-gray-300'
                        } rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500`}
                        min={new Date().toISOString().split('T')[0]} 
                        required
                      />
                      {validationErrors.expiryDate && (
                        <p className="mt-1 text-sm text-error-600">{validationErrors.expiryDate}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        The agreement will expire on this date if not signed by all parties.
                      </p>
                    </div>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Document
                      </label>
                      <FileUpload
                        onFileSelected={setFile}
                        accept=".pdf,.doc,.docx,.txt"
                        selectedFile={file}
                      />
                      {validationErrors.file && (
                        <p className="text-sm text-error-600 mt-1">{validationErrors.file}</p>
                      )}
                    </div>

                    <div className="mb-4">
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
                  </>
                )}
                
                {/* Signers Section */}
                <div className="mt-6">
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
                    <div 
                      key={signer.id}
                      className={`p-3 mb-2 border rounded-md ${
                        index === activeSignerIndex ? 'border-primary-300 bg-primary-50' : ''
                      }`}
                    >
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
                        onChange={(e) => handleSignerEmailChange(index, e.target.value)}
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
                  
                  {validationErrors.signers && (
                    <p className="text-sm text-error-600 mt-1">{validationErrors.signers}</p>
                  )}
                  {validationErrors.signatureAreas && (
                    <p className="text-sm text-error-600 mt-1">{validationErrors.signatureAreas}</p>
                  )}
                </div>
              </div>
              
              {/* Right Column: Document Preview with Integrated Signature Areas */}
              <div className="lg:col-span-3 bg-white rounded-lg shadow p-4">
                {(activeTab === 'existing' && selectedAgreement?.fileUrl) || (activeTab === 'new' && file) ? (
                  <div className="relative document-container">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Document with Signature Areas</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Select a signer, then drag anywhere on the document to create signature areas.
                    </p>
                    
                    {/* Integrated view with the document and signature area selection */}
                    <SignatureAreaSelector
                      documentFile={activeTab === 'new' ? file : null}
                      documentUrl={activeTab === 'existing' && selectedAgreement ? selectedAgreement.fileUrl : undefined}
                      pageNumber={currentPage}
                      width={700}
                      height={900}
                      signatureAreas={getSignatureAreasForPage(currentPage)}
                      activeSignerId={signers[activeSignerIndex]?.id || null}
                      onAreaSelected={(signerId, area) => handleSignatureAreaSelected(signerId, area)}
                      signers={signers.map(s => ({ id: s.id, name: s.name, color: s.color }))}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">
                      {activeTab === 'existing' 
                        ? 'Select a draft agreement' 
                        : 'Upload a document'}
                    </h3>
                    <p className="text-sm text-gray-500 text-center max-w-md mb-6">
                      {activeTab === 'existing'
                        ? 'Choose an agreement from your drafts to add signature areas'
                        : 'Upload a PDF, DOC, or DOCX file to define signature areas'}
                    </p>
                    {activeTab === 'new' && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={e => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) {
                              setFile(selectedFile);
                              // console.log("File selected:", selectedFile.name);
                            }
                            // Always reset input value so the same file can be selected again
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        />
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => fileInputRef.current?.click()}
                          icon={<Upload size={16} />}
                          className="shadow-sm"
                        >
                          Upload Document
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {error && (
            <div className="mt-6 p-3 bg-error-50 text-error-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="flex justify-end mt-6">
            <Button
              type="button"
              variant="outline"
              className="mr-3"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={activeTab === 'existing' ? isSending : isUploading}
              disabled={
                (activeTab === 'existing' && (!selectedAgreement || signers.length === 0)) ||
                (activeTab === 'new' && (!file || !title || signers.length === 0))
              }
              icon={<SendIcon size={16} />}
            >
              {activeTab === 'existing' ? 'Send for Signature' : 'Create & Send'}
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Send;

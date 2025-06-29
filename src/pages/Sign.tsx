import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Check, XCircle, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import SignatureCanvas from '../components/ui/SignatureCanvas';
import Input from '../components/ui/Input';
import FileUpload from '../components/ui/FileUpload';
import { Agreement } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementById, signAgreement, getAgreementFileDataUrl } from '../utils/suiClient';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Sign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'draw' | 'text' | 'upload'>('draw');
  const [signatureText, setSignatureText] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [showDrawModal, setShowDrawModal] = useState(false);
  
  useEffect(() => {
    const loadAgreement = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        setPdfUrl(null);
        setPdfError(null);
        const agreementData = await fetchAgreementById(id);
        
        if (!agreementData) {
          setError('Agreement not found.');
          return;
        }
        
        setAgreement(agreementData);

        // Load the PDF from Walrus using fileHash/blobId
        if (agreementData.fileHash) {
          setPdfLoading(true);
          try {
            const url = await getAgreementFileDataUrl(agreementData.fileHash);
            setPdfUrl(url);
          } catch (err) {
            // console.error('Failed to load document from storage:', err);
            setPdfError('Failed to load document from storage.');
          } finally {
            setPdfLoading(false);
          }
        }
      } catch (error) {
        // console.error('Error fetching agreement:', error);
        setError('Failed to load agreement.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAgreement();
  }, [id]);
  
  // Find all areas for this user
  const userAreas = agreement?.signer_areas?.filter(
    area => area.signer === user?.address && !area.signed && !area.rejected
  ) || [];

  // Handle signature input changes
  const handleDrawSignature = (dataUrl: string) => {
    setSignature(dataUrl);
    setSignatureImage('');
    setSignatureText('');
    setShowDrawModal(false);
  };
  const handleTextSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignatureText(e.target.value);
    setSignature('');
    setSignatureImage('');
  };
  const handleUploadSignature = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      setSignatureImage(e.target?.result as string);
      setSignature('');
      setSignatureText('');
    };
    reader.readAsDataURL(file);
  };

  // The signature to use for overlay and confirm
  const activeSignature = signatureType === 'draw' ? signature : signatureType === 'text' ? signatureText : signatureImage;
  const canSign = userAreas.length > 0 && !!activeSignature;

  // Confirm and pay fee, then sign all areas for this user
  const handleConfirm = async () => {
    if (!agreement || !user || !activeSignature) return;
    try {
      setIsSigning(true);
      setError(null);
      
      // First, upload the signature to Walrus storage
      let signatureBlobId = '';
      
      try {
        // If it's a draw or upload signature, upload to Walrus
        if (signatureType === 'draw' || signatureType === 'upload') {
          // console.log('Uploading signature to Walrus storage...');
          
          // Convert the signature data URL to a blob
          const signatureBlob = await (async () => {
            const res = await fetch(activeSignature);
            return await res.blob();
          })();
          
          // Upload to Walrus (using uploadToWalrus from walrusClient.ts)
          const signatureFile = new File([signatureBlob], 'signature.png', { type: 'image/png' });
          
          // In a real app with actual zkLogin, this would use the current user's account
          // For demo, we'll use a simulated upload since we don't have a real zkLogin account
          const { uploadFileToWalrus } = await import('../utils/suiClient');
          signatureBlobId = await uploadFileToWalrus(signatureFile);
          
          // console.log(`Signature uploaded to Walrus with blob ID: ${signatureBlobId}`);
        } else if (signatureType === 'text') {
          // For text signatures, create a simple blob ID (in a real app, this might be a rendered image)
          signatureBlobId = `walrus-text-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        }
      } catch (uploadError) {
        // console.error('Error uploading signature to Walrus:', uploadError);
        setError('Failed to upload signature. Please try again.');
        setIsSigning(false);
        return;
      }
      
      // Now sign all areas for this user using the updated signAgreement function
      // which should properly handle the signature_blob_id parameter
      for (const area of userAreas) {
        // In a real app with actual zkLogin integration, we would use:
        // import { suiClient } from '../utils/suiClient';
        // import { signArea } from '../services/suiService';
        // const zkLoginAccount = ... (get from user context)
        // const areaIdx = agreement.signer_areas.findIndex(a => a === area);
        // const signatureHash = Array.from(new TextEncoder().encode(activeSignature));
        // await signArea(suiClient, zkLoginAccount, agreement.id, areaIdx, signatureHash, signatureBlobId);
        
        // For the mock implementation, continue using signAgreement
        await signAgreement(agreement.id, user.address, {
          dataUrl: signatureType === 'draw' || signatureType === 'upload' ? activeSignature : undefined,
          text: signatureType === 'text' ? activeSignature : undefined,
          areaIdx: agreement.signer_areas.findIndex(a => a === area),
          position: { x: area.x, y: area.y },
          page: area.page,
          signatureBlobId, // Pass the blob ID to the mock function
        });
        
        // console.log(`Signed area with blob ID: ${signatureBlobId}`);
      }
      
      // Show success message and navigate back to dashboard
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      // console.error('Error signing agreement:', error);
      setError('An error occurred while confirming the agreement.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = () => {
    if (!agreement?.fileHash) return;
    // Download from Walrus using fileHash/blobId
    import('../utils/documentUtils').then(({ downloadDocument }) => {
      downloadDocument(agreement.fileHash, agreement.fileName || 'agreement.pdf');
    });
  };

  if (isLoading) {
    return (
      <PageContainer title="Agreement">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer title="Agreement">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <XCircle className="h-12 w-12 text-error-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-4">{error}</h3>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (!agreement) return null;

  return (
    <PageContainer title={agreement?.title}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Signature input options */}
        <div className="col-span-1 bg-white rounded-lg shadow-sm p-6 flex flex-col gap-6">
          <h3 className="text-lg font-semibold mb-2">Add Your Signature</h3>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="sigtype" checked={signatureType === 'draw'} onChange={() => setSignatureType('draw')} />
              Draw
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="sigtype" checked={signatureType === 'text'} onChange={() => setSignatureType('text')} />
              Type
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="sigtype" checked={signatureType === 'upload'} onChange={() => setSignatureType('upload')} />
              Upload
            </label>
          </div>
          {signatureType === 'draw' && (
            <>
              <Button variant="outline" onClick={() => setShowDrawModal(true)}>
                {signature ? 'Edit Signature' : 'Draw Signature'}
              </Button>
              {signature && <img src={signature} alt="Signature preview" className="mt-2 border rounded max-h-20" />}
            </>
          )}
          {signatureType === 'text' && (
            <Input
              label="Type your name"
              value={signatureText}
              onChange={handleTextSignature}
              placeholder="Your Name"
            />
          )}
          {signatureType === 'upload' && (
            <FileUpload
              onFileSelected={handleUploadSignature}
              accept="image/*"
              label="Upload signature image"
            />
          )}
        </div>
        {/* Right: PDF preview with signature overlays */}
        <div className="col-span-1 md:col-span-3 bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">{agreement.title}</h2>
            <Button variant="outline" size="sm" icon={<Download size={16} />} onClick={handleDownload}>
              Download
            </Button>
          </div>
          <div className="mb-6">
            {pdfLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                <span className="ml-2 text-gray-500">Loading document...</span>
              </div>
            ) : pdfError ? (
              <div className="flex flex-col items-center justify-center h-64 text-error-600">
                <XCircle className="h-10 w-10 mb-2" />
                <p>{pdfError}</p>
              </div>
            ) : pdfUrl ? (
              <div className="relative">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  className="border rounded-lg overflow-hidden"
                  options={{ 
                    cMapUrl: '/cmaps/',
                    cMapPacked: true,
                    standardFontDataUrl: '/standard_fonts/'
                  }}
                >
                  <Page
                    pageNumber={currentPage}
                    width={800}
                    className="mx-auto"
                  />
                  {/* Overlay signature(s) on all user areas for this page */}
                  {userAreas.filter(area => area.page === currentPage).map((area, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: area.x, top: area.y, width: area.width, height: area.height,
                        pointerEvents: 'none',
                        zIndex: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {signatureType === 'text' && signatureText ? (
                        <span className="font-signature text-xl text-black bg-transparent">{signatureText}</span>
                      ) : signatureType === 'upload' && signatureImage ? (
                        <img src={signatureImage} alt="Signature" className="max-h-full max-w-full object-contain bg-transparent" />
                      ) : signatureType === 'draw' && signature ? (
                        <img src={signature} alt="Signature" className="max-h-full max-w-full object-contain bg-transparent" />
                      ) : null}
                    </div>
                  ))}
                </Document>
                {/* Page navigation */}
                {numPages && numPages > 1 && (
                  <div className="flex justify-center mt-4 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 py-2">
                      Page {currentPage} of {numPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                      disabled={currentPage === numPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <FileText className="h-10 w-10 mb-2" />
                <p>No document available.</p>
              </div>
            )}
          </div>
          {/* Confirm button at bottom */}
          {canSign && (
            <div className="flex justify-end mt-8">
              <Button
                variant="primary"
                onClick={handleConfirm}
                isLoading={isSigning}
                disabled={!activeSignature}
                icon={<Check size={16} />}
              >
                Confirm & Pay Fee
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Draw signature modal */}
      {showDrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Draw Your Signature</h3>
            <SignatureCanvas onChange={handleDrawSignature} />
            <div className="flex justify-end mt-4 gap-2">
              <Button variant="outline" onClick={() => setShowDrawModal(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Sign;
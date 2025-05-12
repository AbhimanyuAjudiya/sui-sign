import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Check, XCircle, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import SignatureCanvas from '../components/ui/SignatureCanvas';
import { Agreement } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementById, signAgreement } from '../utils/suiClient';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Sign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signature, setSignature] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
    const loadAgreement = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const agreementData = await fetchAgreementById(id);
        
        if (!agreementData) {
          setError('Agreement not found.');
          return;
        }
        
        setAgreement(agreementData);
      } catch (error) {
        console.error('Error fetching agreement:', error);
        setError('Failed to load agreement.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAgreement();
  }, [id]);
  
  const handleSign = async () => {
    if (!agreement || !user || !signature) return;
    
    try {
      setIsSigning(true);
      setError(null);
      
      const success = await signAgreement(agreement.id, user.address, {
        dataUrl: signature,
        position: { x: 100, y: 100 }, // Default position
        page: currentPage
      });
      
      if (success) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setError('Failed to sign agreement. Please try again.');
      }
    } catch (error) {
      console.error('Error signing agreement:', error);
      setError('An error occurred while signing the agreement.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownload = () => {
    if (!agreement?.fileUrl) return;
    window.open(agreement.fileUrl, '_blank');
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

  const canSign = !agreement.signedByRecipient && agreement.recipient === user?.address;

  return (
    <PageContainer title={agreement.title}>
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{agreement.title}</h2>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={16} />}
                onClick={handleDownload}
              >
                Download
              </Button>
            </div>
            <p className="text-gray-600">{agreement.description}</p>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <Document
                file={agreement.fileUrl}
                onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                className="border rounded-lg overflow-hidden"
              >
                <Page
                  pageNumber={currentPage}
                  width={800}
                  className="mx-auto"
                />
              </Document>
              
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

            {canSign && (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sign Here</h3>
                  <SignatureCanvas onChange={setSignature} />
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleSign}
                    isLoading={isSigning}
                    disabled={!signature}
                    icon={<Check size={16} />}
                  >
                    Sign Agreement
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Sign;
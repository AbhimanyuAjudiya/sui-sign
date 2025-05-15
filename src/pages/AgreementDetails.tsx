import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Send, User, Clock, CheckCircle, Download } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';
import Button from '../components/ui/Button';
import { Agreement, AgreementStatus } from '../types';
import { useUser } from '../context/UserContext';
import { fetchAgreementById, signAgreement } from '../utils/suiClient';
import { downloadDocument, getDocumentDataUrl } from '../utils/documentUtils';

const AgreementDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentDataUrl, setDocumentDataUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }
    
    const loadAgreement = async () => {
      try {
        setIsLoading(true);
        setError(null); // Clear any existing errors when loading
        
        console.log('Fetching agreement:', id);
        const agreementData = await fetchAgreementById(id);
        
        if (!agreementData) {
          console.error('Agreement not found with ID:', id);
          setError('Agreement not found.');
          return;
        }
        
        console.log('Agreement data loaded:', agreementData);
        setAgreement(agreementData);
        
        // Try to load the document preview
        if (agreementData.fileHash) {
          try {
            console.log('Loading document preview for hash:', agreementData.fileHash);
            const dataUrl = await getDocumentDataUrl(agreementData.fileHash);
            
            if (dataUrl) {
              console.log('Document preview loaded successfully');
              setDocumentDataUrl(dataUrl);
            } else {
              console.warn('Empty data URL returned for document preview');
            }
          } catch (err) {
            console.error('Error loading document preview:', err);
            // Don't set an error here, just show fallback UI
          }
        } else {
          console.warn('No fileHash available for document preview');
        }
      } catch (error) {
        console.error('Error fetching agreement:', error);
        setError('Failed to load agreement. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAgreement();
  }, [id, navigate]);

  // Handle document download
  const handleDownload = async () => {
    if (!agreement) return;
    
    try {
      setIsDownloading(true);
      
      if (!agreement.fileHash) {
        throw new Error('No document file exists for this agreement');
      }
      
      const fileName = agreement.fileName || `agreement-${agreement.id}.pdf`;
      console.log(`Attempting to download document: ${fileName} (${agreement.fileHash})`);
      
      await downloadDocument(
        agreement.fileHash, 
        fileName
      );
      
      // Show success message (could use a toast notification in a real app)
      console.log('Document downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      // Show friendly error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while downloading';
      
      alert(`Failed to download document: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = () => {
    if (!agreement) return null;
    
    let color, text, icon;
    
    // Check if the agreement is expired first
    const isExpired = agreement.expiresAt && agreement.expiresAt < Date.now();
    
    if (isExpired) {
      color = 'bg-error-100 text-error-800';
      text = 'Expired';
      icon = <Clock size={14} className="mr-1" />;
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          {icon}{text}
        </span>
      );
    }
    
    switch (agreement.status) {
      case AgreementStatus.DRAFT:
        color = 'bg-gray-100 text-gray-800';
        text = 'Draft';
        icon = <Clock size={14} className="mr-1" />;
        break;
      case AgreementStatus.PENDING:
        color = 'bg-warning-100 text-warning-800';
        text = 'Pending Signature';
        icon = <Send size={14} className="mr-1" />;
        break;
      case AgreementStatus.SIGNED:
        color = 'bg-success-100 text-success-800';
        text = 'Signed';
        icon = <CheckCircle size={14} className="mr-1" />;
        break;
      default:
        color = 'bg-gray-100 text-gray-800';
        text = 'Unknown';
        icon = null;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {icon}{text}
      </span>
    );
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const isAgreementExpired = (agreement: Agreement): boolean => {
    if (!agreement.expiresAt) return false;
    return agreement.expiresAt < Date.now();
  };

  if (isLoading) {
    return (
      <PageContainer title="Agreement Details">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </PageContainer>
    );
  }

  if (error || !agreement) {
    return (
      <PageContainer title="Agreement Details">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{error || 'Agreement not found.'}</h3>
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }
  
  const isCreator = agreement.creator === user?.address;
  const canSendToPending = isCreator && agreement.status === AgreementStatus.DRAFT;

  return (
    <PageContainer 
      title="Agreement Details"
      actions={
        canSendToPending ? (
          <Button
            variant="primary"
            icon={<Send size={16} />}
            onClick={() => navigate(`/send?agreementId=${agreement.id}`)}
          >
            Send for Signature
          </Button>
        ) : null
      }
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
              <h2 className="text-xl font-semibold text-gray-900">{agreement.title}</h2>
              {getStatusBadge()}
            </div>
            <p className="text-gray-600">{agreement.description}</p>
          </div>
          
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document</h3>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={16} />}
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>
            <div className="border border-gray-200 rounded-md bg-white p-4 mb-2 h-64 flex items-center justify-center">
              {documentDataUrl ? (
                <iframe
                  src={documentDataUrl}
                  title="Document Preview"
                  className="w-full h-full"
                  onError={(e) => {
                    console.error('Error loading document in iframe:', e);
                    // Clear the data URL to show the fallback UI
                    setDocumentDataUrl(null);
                  }}
                />
              ) : (
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Document preview not available</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {agreement.fileHash ? 
                      'There was an issue loading the preview, but you can still download the document' :
                      'No document has been uploaded for this agreement'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Document ID: {agreement.fileHash || 'Not available'}
            </p>
          </div>
          
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Signatures</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center">
                  <User className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {isCreator ? 'You (Creator)' : 'Creator'}
                    </p>
                    <p className="text-xs text-gray-500">{agreement.creator}</p>
                  </div>
                </div>
                {agreement.signedByCreator ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    <CheckCircle size={12} className="mr-1" />Signed
                  </span>
                ) : (
                  <span className="text-xs text-gray-500">Not signed</span>
                )}
              </div>
              
              {agreement.status !== AgreementStatus.DRAFT && agreement.recipient && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {agreement.recipient === user?.address ? 'You (Recipient)' : 'Recipient'}
                      </p>
                      <p className="text-xs text-gray-500">{agreement.recipient}</p>
                    </div>
                  </div>
                  {agreement.signedByRecipient ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      <CheckCircle size={12} className="mr-1" />Signed
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Awaiting signature</span>
                  )}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created On</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(agreement.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Agreement ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 break-all">{agreement.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Visibility</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {agreement.isPublic ? 'Public' : 'Private'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Expires On</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {agreement.expiresAt ? (
                      <>
                        {formatDate(agreement.expiresAt)}
                        {agreement.expiresAt < Date.now() && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-error-100 text-error-800">
                            Expired
                          </span>
                        )}
                      </>
                    ) : 'No expiration date'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AgreementDetails;
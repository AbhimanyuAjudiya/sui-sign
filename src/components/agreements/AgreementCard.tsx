import React from 'react';
import { useNavigate } from 'react-router-dom';
// Removed Clock from imports as it was unused
import { CheckCircle, FileText, Send, AlertCircle, XCircle, CalendarX } from 'lucide-react';
// Removed SignerArea from imports as it was unused in this component directly
import { Agreement, AgreementStatus } from '../../types';
import { motion } from 'framer-motion';

interface AgreementCardProps {
  agreement: Agreement;
  userAddress: string;
}

const AgreementCard: React.FC<AgreementCardProps> = ({ agreement, userAddress }) => {
  const navigate = useNavigate();
  
  const isCreator = agreement.creator === userAddress;
  // isSigner was declared but not used, removed. currentUserSignerArea is used instead for logic.
  // const isSigner = agreement.signer_areas?.some(area => area.signer === userAddress);
  
  // Find the specific area for the current user if they are a signer
  const currentUserSignerArea = agreement.signer_areas?.find(area => area.signer === userAddress);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  const getStatusIcon = () => {
    switch (agreement.status) {
      case AgreementStatus.DRAFT:
        return <FileText className="h-5 w-5 text-gray-500" />; // Changed from Clock for Draft
      case AgreementStatus.PENDING:
        return <Send className="h-5 w-5 text-yellow-500" />; // Ensure warning-500 is defined or use a standard color
      case AgreementStatus.SIGNED:
        return <CheckCircle className="h-5 w-5 text-green-500" />; // Ensure success-500 is defined
      case AgreementStatus.REJECTED:
        return <XCircle className="h-5 w-5 text-red-500" />; // Ensure error-500 is defined
      case AgreementStatus.EXPIRED:
        return <CalendarX className="h-5 w-5 text-gray-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (agreement.status) {
      case AgreementStatus.DRAFT:
        return 'Draft';
      case AgreementStatus.PENDING:
        if (isCreator) {
          return 'Pending Signatures';
        } else if (currentUserSignerArea && !currentUserSignerArea.signed && !currentUserSignerArea.rejected) {
          return 'Awaiting Your Signature';
        } else if (currentUserSignerArea && currentUserSignerArea.signed) {
          return 'You Signed - Pending Others';
        } else if (currentUserSignerArea && currentUserSignerArea.rejected) {
          return 'You Rejected - Pending Others';
        }
        return 'Pending Signatures';
      case AgreementStatus.SIGNED:
        return 'Signed';
      case AgreementStatus.REJECTED:
        // Check if the current user was the one who rejected
        if (currentUserSignerArea?.rejected) {
            return 'You Rejected This Agreement';
        }
        // Find if any signer rejected
        const rejecter = agreement.signer_areas?.find(area => area.rejected);
        if (rejecter) {
            // In a real app, you might want to show which signer rejected if known and public
            return 'Rejected by a Signer';
        }
        return 'Rejected';
      case AgreementStatus.EXPIRED:
        return 'Expired';
      default:
        const exhaustiveCheck: never = agreement.status;
        return `Unknown Status: ${exhaustiveCheck}`;
    }
  };
  
  const handleClick = () => {
    // If the user is a signer, the agreement is pending, and they haven't signed or rejected yet
    if (agreement.status === AgreementStatus.PENDING && currentUserSignerArea && !currentUserSignerArea.signed && !currentUserSignerArea.rejected) {
      navigate(`/sign/${agreement.id}`);
    } else {
      // For all other cases, navigate to the agreement details page
      navigate(`/agreement/${agreement.id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
      onClick={handleClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">{agreement.title}</h3>
            <p className="text-sm text-gray-500 mb-2 truncate">{agreement.description}</p>
          </div>
          <div className="flex-shrink-0">{getStatusIcon()}</div>
        </div>
        
        <div className="flex items-center text-sm">
          <FileText className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-gray-600 truncate">
            {agreement.fileName || 'Document'}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {formatDate(agreement.createdAt)}
        </div>
        <div className="text-xs font-medium text-gray-900">
          {getStatusText()}
        </div>
      </div>
    </motion.div>
  );
};

export default AgreementCard;
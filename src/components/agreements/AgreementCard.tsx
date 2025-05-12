import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, FileText, Send, AlertCircle } from 'lucide-react';
import { Agreement, AgreementStatus } from '../../types';
import { motion } from 'framer-motion';

interface AgreementCardProps {
  agreement: Agreement;
  userAddress: string;
}

const AgreementCard: React.FC<AgreementCardProps> = ({ agreement, userAddress }) => {
  const navigate = useNavigate();
  
  const isCreator = agreement.creator === userAddress;
  const isRecipient = agreement.recipient === userAddress;
  
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
        return <Clock className="h-5 w-5 text-gray-500" />;
      case AgreementStatus.PENDING:
        return <Send className="h-5 w-5 text-warning-500" />;
      case AgreementStatus.SIGNED:
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-error-500" />;
    }
  };
  
  const getStatusText = () => {
    switch (agreement.status) {
      case AgreementStatus.DRAFT:
        return 'Draft';
      case AgreementStatus.PENDING:
        if (isCreator) {
          return 'Waiting for signature';
        } else {
          return 'Awaiting your signature';
        }
      case AgreementStatus.SIGNED:
        return 'Signed';
      default:
        return 'Unknown';
    }
  };
  
  const handleClick = () => {
    if (agreement.status === AgreementStatus.PENDING && isRecipient) {
      navigate(`/sign/${agreement.id}`);
    } else {
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
import React, { useState } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { truncateAddress, copyToClipboard } from '../../utils/address';

interface AddressDisplayProps {
  address: string;
  startChars?: number;
  endChars?: number;
  className?: string;
}

/**
 * A component to display a truncated and copyable Sui address
 */
const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  startChars = 6,
  endChars = 4,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-mono">{truncateAddress(address, startChars, endChars)}</span>
      <button
        onClick={handleCopy}
        className="ml-1 p-1 rounded-full hover:bg-gray-100 transition-colors"
        aria-label="Copy address to clipboard"
      >
        {copied ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-500" />
        )}
      </button>
    </div>
  );
};

export default AddressDisplay;

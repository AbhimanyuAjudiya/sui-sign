import { Agreement } from '../types';
import { suiClient } from './suiClient';
import { TransactionBlock } from '@mysten/sui/transactions';
import { executeWithSponsorship } from './sponsorshipUtils';

/**
 * Handles transaction execution with sponsorship fallback
 * If the user doesn't have gas, this will use the sponsorship service
 */
export async function executeTransactionWithSponsorship(
  txBlock: TransactionBlock,
  senderAddress: string
): Promise<string> {
  try {
    // First attempt: Try to execute with user's own gas
    // console.log('Attempting to execute transaction with user gas...');
    
    try {
      // Sign and submit the transaction using user's gas
      const { bytes, signature } = await txBlock.sign({
        client: suiClient,
        // In a real implementation, this would use the user's wallet or zkLogin account
        // For demo purposes, this will likely fail due to lack of gas
      });
      
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true }
      });
      
      // console.log('Transaction executed successfully with user gas:', result.digest);
      return result.digest;
      
    } catch (gasError) {
      // If gas-related error, use sponsorship
      if (gasError instanceof Error && 
          (gasError.message.includes('gas') || 
          gasError.message.includes('coin') || 
          gasError.message.includes('No valid gas coins'))) {
        // console.log('No gas available, attempting to use sponsorship...');
        
        // Use the sponsorship service
        return await executeWithSponsorship(txBlock, senderAddress);
      }
      
      // If not gas-related, rethrow
      throw gasError;
    }
  } catch (error) {
    // console.error('Transaction execution failed:', error);
    throw error;
  }
}

/**
 * Fetches agreements from the blockchain for a specific address
 */
export async function getAgreementsFromBlockchain(address: string): Promise<Agreement[]> {
  // console.log('Fetching agreements from blockchain for address:', address);
  
  try {
    // For a real implementation, this would:
    // 1. Query events or objects from the Sui blockchain
    // 2. Parse them into Agreement objects
    // For demo purposes, use localStorage
    const storedAgreements = localStorage.getItem('agreements');
    if (storedAgreements) {
      const agreements = JSON.parse(storedAgreements);
      if (Array.isArray(agreements)) {
        // Filter for this user
        return agreements.filter(a => {
          const isCreator = a.creator === address;
          const isRecipient = a.recipient === address;
          const isSigner = Array.isArray(a.signer_areas) && a.signer_areas.some(area => area.signer === address);
          return isCreator || isRecipient || isSigner;
        });
      }
    }
    return [];
  } catch (error) {
    // console.error('Error fetching agreements from blockchain:', error);
    return [];
  }
}

/**
 * Fetches a specific agreement by ID from the blockchain
 */
export async function getAgreementByIdFromBlockchain(id: string): Promise<Agreement | null> {
  // console.log('Fetching agreement from blockchain with ID:', id);
  
  try {
    // For a real implementation, this would:
    // 1. Query the object details from the Sui blockchain
    // 2. Parse it into an Agreement object
    // For demo purposes, use localStorage
    const storedAgreements = localStorage.getItem('agreements');
    if (storedAgreements) {
      const agreements = JSON.parse(storedAgreements);
      if (Array.isArray(agreements)) {
        return agreements.find(a => a.id === id) || null;
      }
    }
    return null;
  } catch (error) {
    // console.error('Error fetching agreement from blockchain:', error);
    return null;
  }
}

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Agreement, AgreementStatus, SignerArea } from '../types';
import { TransactionBlock } from '@mysten/sui/transactions';
import { fileToArrayBuffer } from './fileUtils';

// Use the correct RPC URL for SuiClient
const SUI_RPC_URL = import.meta.env.VITE_SUI_FULLNODE_RPC_URL || getFullnodeUrl('testnet');
export const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Helper function to load agreements from storage
const loadAgreementsFromStorage = (): Agreement[] => {
  try {
    const storedAgreements = localStorage.getItem('agreements');
    if (storedAgreements) {
      // console.log('Loading agreements from localStorage');
      const agreements = JSON.parse(storedAgreements);
      return Array.isArray(agreements) ? agreements : [];
    }
  } catch (error) {
    // console.error('Error loading agreements from localStorage:', error);
    localStorage.removeItem('agreements');
  }
  return [];
};

// Helper function to save agreements to storage
const saveAgreementsToStorage = (agreements: Agreement[]) => {
  try {
    // console.log(`Saving ${agreements.length} agreements to localStorage`);
    localStorage.setItem('agreements', JSON.stringify(agreements));
    // console.log('Agreements saved successfully');
  } catch (error) {
    // console.error('Error saving agreements to localStorage:', error);
  }
};

// Mock keypair for demo purposes (would come from zkLogin in real app)
export const generateKeypair = () => {
  return Ed25519Keypair.generate();
};

// Function to create agreement bypassing blockchain for demo
export async function createAgreement(
  title: string,
  description: string,
  fileHash: string,
  creator: string,
  expiryDate?: string
): Promise<string> {
  // console.log('Creating agreement (demo mode):', { title, description, fileHash, creator, expiryDate });
  
  try {
    // Generate a unique ID for the agreement
    const agreementId = `0x${Date.now().toString(16)}${Math.floor(Math.random() * 10000000000).toString(16)}`;
    
    // Convert expiry date to timestamp
    const expiryTimestamp = expiryDate 
      ? new Date(expiryDate).getTime() 
      : (new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Create the agreement object directly (bypassing blockchain)
    const newAgreement: Agreement = {
      id: agreementId,
      creator: creator,
      title,
      description,
      fileHash,
      fileUrl: fileHash, // Store the fileHash directly
      status: AgreementStatus.DRAFT,
      signer_areas: [],
      createdAt: Date.now(),
      expiresAt: expiryTimestamp,
      isPublic: false,
      feePaid: false,
    };
    
    // console.log(`Demo: Created new agreement with ID ${agreementId}`, newAgreement);
    
    // Add the agreement to localStorage
    const existingAgreements = loadAgreementsFromStorage();
    const updatedAgreements = [...existingAgreements, newAgreement];
    saveAgreementsToStorage(updatedAgreements);
    
    // console.log(`Demo: Saved agreement to localStorage, total agreements: ${updatedAgreements.length}`);
    return agreementId;
    
  } catch (error) {
    // console.error('Error creating agreement:', error);
    throw new Error(`Failed to create agreement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to fetch agreements for a user
export async function fetchAgreementsForUser(address: string): Promise<Agreement[]> {
  // console.log('Fetching agreements for address:', address);
  
  if (!address) {
    // console.error('Invalid address provided');
    return [];
  }
  
  try {
    // Load directly from localStorage for demo
    const agreements = loadAgreementsFromStorage();
    
    // Filter for this user
    const userAgreements = agreements.filter(a => {
      const isCreator = a.creator === address;
      const isRecipient = a.recipient === address;
      const isSigner = Array.isArray(a.signer_areas) && a.signer_areas.some(area => area.signer === address);
      
      // if (isCreator) console.log(`Agreement ${a.id} - User is creator`);
      // if (isRecipient) console.log(`Agreement ${a.id} - User is recipient`);
      // if (isSigner) console.log(`Agreement ${a.id} - User is a signer`);
      
      return isCreator || isRecipient || isSigner;
    });
    
    // console.log(`Found ${userAgreements.length} agreements for user ${address}`);
    return userAgreements.map(a => ({...a})); // Return copies to prevent direct mutations
  } catch (error) {
    // console.error('Error fetching agreements for user:', error);
    return [];
  }
}

// Function to send an agreement to recipients
export async function sendAgreement(
  agreementId: string,
  recipient: string,
  signer: string, // This is actually the sender/creator - confusing parameter name
  expiryDate?: string,
  signatureAreas?: SignerArea[]
): Promise<boolean> {
  // console.log('Sending agreement:', { agreementId, recipient, signer, expiryDate, signatureAreas });
  
  try {
    // Load existing agreements
    const existingAgreements = loadAgreementsFromStorage();
    
    // Find the agreement to update
    const agreementIndex = existingAgreements.findIndex(a => a.id === agreementId);
    if (agreementIndex === -1) {
      // console.error(`Agreement not found with ID: ${agreementId}`);
      return false;
    }
    
    // Update the agreement
    const agreement = { ...existingAgreements[agreementIndex] };
    agreement.status = AgreementStatus.PENDING;
    agreement.recipient = recipient; // Set the recipient field
    
    // Handle signature areas - ensure recipient is added as a signer
    if (signatureAreas && signatureAreas.length > 0) {
      // Make sure all signature areas have the correct signer (recipient)
      const updatedSignatureAreas = signatureAreas.map(area => ({
        ...area,
        signer: recipient // Ensure the signer field is set to recipient
      }));
      
      // Remove any existing areas for this recipient and add the new ones
      agreement.signer_areas = [
        ...agreement.signer_areas.filter(area => area.signer !== recipient),
        ...updatedSignatureAreas
      ];
    } else if (!agreement.signer_areas || agreement.signer_areas.length === 0) {
      // Create a default signature area if none exist
      agreement.signer_areas = [{
        signer: recipient,
        page: 1,
        x: 100,
        y: 400,
        width: 200,
        height: 50,
        inputType: 0,
        value: [],
        signed: false,
        rejected: false
      }];
    } else if (!agreement.signer_areas.some(area => area.signer === recipient)) {
      // Add a default area for the recipient if they're not already a signer
      agreement.signer_areas.push({
        signer: recipient,
        page: 1,
        x: 100,
        y: 400,
        width: 200,
        height: 50,
        inputType: 0,
        value: [],
        signed: false,
        rejected: false
      });
    }
    
    // Update expiry date if provided
    if (expiryDate) {
      agreement.expiresAt = new Date(expiryDate).getTime();
    }
    
    // Update the agreement in our list
    existingAgreements[agreementIndex] = agreement;
    
    // Save to local storage
    saveAgreementsToStorage(existingAgreements);
    
    // console.log('Updated agreement with recipient and signature areas:', agreement);
    return true;
    
  } catch (error) {
    // console.error('Error sending agreement:', error);
    return false;
  }
}

// Function for signing an agreement
export async function signAgreement(
  agreementId: string,
  signer: string,
  opts?: {
    dataUrl?: string; // base64 image
    text?: string;
    areaIdx?: number;
    position?: { x: number; y: number };
    page?: number;
    signatureBlobId?: string; // Walrus blob ID for this signature
  }
): Promise<boolean> {
  // console.log('Signing agreement:', { agreementId, signer, opts });
  
  try {
    // Load existing agreements
    const existingAgreements = loadAgreementsFromStorage();
    
    // Find the agreement to update
    const agreementIndex = existingAgreements.findIndex(a => a.id === agreementId);
    if (agreementIndex === -1) {
      // console.error(`Agreement not found with ID: ${agreementId}`);
      return false;
    }
    
    // Create a copy of the agreement to update
    const agreement = { ...existingAgreements[agreementIndex] };
    
    // Find the correct signer area
    let areaIdx = opts?.areaIdx;
    if (typeof areaIdx !== 'number' && opts?.page != null && opts?.position) {
      areaIdx = agreement.signer_areas.findIndex(
        a => a.signer === signer && a.page === opts.page && a.x === opts.position!.x && a.y === opts.position!.y
      );
    }
    if (typeof areaIdx !== 'number' || areaIdx < 0) {
      // fallback: first unsigned area for this signer
      areaIdx = agreement.signer_areas.findIndex(a => a.signer === signer && !a.signed && !a.rejected);
    }
    
    // Update the signature area
    if (areaIdx >= 0) {
      const area = { ...agreement.signer_areas[areaIdx] };
      
      if (!area.signed && !area.rejected) {
        area.fee_paid = true;
        
        let signatureBlob = opts?.signatureBlobId || '';
        
        if (opts?.dataUrl) {
          // Store as base64 string (simulate vector<u8> in real chain)
          area.value = Array.from(unescape(encodeURIComponent(opts.dataUrl))).map(c => c.charCodeAt(0));
          area.inputType = 1; // image
          
          if (!signatureBlob) {
            signatureBlob = `walrus-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
          }
        } else if (opts?.text) {
          area.value = Array.from(unescape(encodeURIComponent(opts.text))).map(c => c.charCodeAt(0));
          area.inputType = 0; // text
          
          if (!signatureBlob) {
            signatureBlob = `walrus-text-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
          }
        }
        
        area.signature_blob_id = signatureBlob;
        area.signed = true;
        
        // Update the area in the agreement
        agreement.signer_areas[areaIdx] = area;
      }
    }
    
    // Check if all areas are signed or rejected
    if (agreement.signer_areas.every(a => a.signed || a.rejected)) {
      agreement.status = AgreementStatus.SIGNED;
    }
    
    // Update agreement in our list
    existingAgreements[agreementIndex] = agreement;
    
    // Save to local storage
    saveAgreementsToStorage(existingAgreements);
    
    // console.log(`Updated agreement ${agreementId} signing status`);
    return true;
    
  } catch (error) {
    // console.error('Error signing agreement:', error);
    return false;
  }
}

// Function to fetch a single agreement by ID
export async function fetchAgreementById(id: string): Promise<Agreement | null> {
  // console.log('Fetching agreement by ID:', id);
  
  if (!id) {
    // console.error('Invalid agreement ID: empty or undefined');
    return null;
  }
  
  try {
    // Load from localStorage for demo
    const agreements = loadAgreementsFromStorage();
    const agreement = agreements.find(a => a.id === id);
    
    if (!agreement) {
      // console.error(`Agreement with ID ${id} not found in localStorage`);
      return null;
    }
    
    // console.log('Found agreement:', agreement);
    return { ...agreement }; // Return a copy to prevent direct mutations
  } catch (error) {
    // console.error(`Error fetching agreement by ID ${id}:`, error);
    return null;
  }
}

// Add a helper to get the real data URL for a Walrus blobId
export async function getAgreementFileDataUrl(fileHash: string): Promise<string> {
  if (!fileHash) return '';
  
  // For mock data compatibility, if fileHash doesn't look like a Walrus blob ID,
  // just return it directly (it might already be a URL)
  if (!fileHash.startsWith('walrus-')) {
    // console.log('File hash is not a Walrus blob ID, returning as-is:', fileHash);
    return fileHash;
  }
  
  // console.log('Getting data URL for Walrus blob ID:', fileHash);
  const { getDocumentDataUrl } = await import('./documentUtils');
  return await getDocumentDataUrl(fileHash);
}

// Upload a file to Walrus storage
export async function uploadFileToWalrus(file: File): Promise<string> {
  // console.log('Uploading file to Walrus:', file.name);
  
  // Import the necessary utilities here to avoid circular dependencies
  const { uploadAgreementToWalrus } = await import('../services/walrusService');
  const { fileToArrayBuffer } = await import('../utils/fileUtils');

  try {
    // Convert the File to an ArrayBuffer
    const fileBuffer = await fileToArrayBuffer(file);
    // console.log('File converted to ArrayBuffer successfully:', file.name, 'size:', fileBuffer.byteLength);

    // For demo, we'll use a simpler approach since full zkLogin isn't implemented
    const mockZkLoginSigner = {
      performSignature: async (_txBytes: Uint8Array) => 'MOCKED_SIGNATURE',
      getAddress: () => '0x1234567890abcdef',
    };
    
    // Upload the file to Walrus with a 10 epoch storage duration
    const blobId = await uploadAgreementToWalrus(fileBuffer, mockZkLoginSigner, 10);
    // console.log('File uploaded to Walrus successfully, blobId:', blobId);
    return blobId;
  } catch (error) {
    // console.error('Error uploading file to Walrus:', error);
    throw new Error(`Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Agreement, AgreementStatus, SignerArea } from '../types';

// In a real app, this would come from environment var// Mock function to fetch agreements for a user
export async function fetchAgreementsForUser(address: string): Promise<Agreement[]> {
  console.log('Fetching agreements for address:', address);
  
  if (!address) {
    console.error('Invalid address provided');
    return [];
  }
  
  try {
    // Force reload from localStorage to get the latest data
    const freshData = loadAgreementsFromStorage();
    if (freshData.length > 0) {
      // Update our in-memory cache
      mockDatabase.agreements = freshData;
    }
    
    // Filter agreements relevant to the user
    const userAgreements = mockDatabase.agreements.filter(a =>
      a.creator === address ||
      a.recipient === address ||
      (Array.isArray(a.signer_areas) && a.signer_areas.some(area => area.signer === address))
    );
    
    console.log(`Found ${userAgreements.length} agreements for user ${address}`);
    
    // Return a copy to prevent direct mutations
    return userAgreements.map(a => ({...a}));
  } catch (error) {
    console.error('Error fetching agreements for user:', error);
    return [];
  }
}
// const AGREEMENT_PACKAGE = 'PACKAGE_ID_PLACEHOLDER'; // We'll use a placeholder for demo purposes
// const AGREEMENT_MODULE = 'agreements';

// Use the correct RPC URL for SuiClient
const SUI_RPC_URL = import.meta.env.VITE_SUI_FULLNODE_RPC_URL || getFullnodeUrl('testnet');
export const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Helper function to load agreements from storage
const loadAgreementsFromStorage = (): Agreement[] => {
  try {
    const storedAgreements = localStorage.getItem('mock-agreements');
    if (storedAgreements) {
      console.log('Loading agreements from localStorage');
      const agreements = JSON.parse(storedAgreements);
      return Array.isArray(agreements) ? agreements : [];
    }
  } catch (error) {
    console.error('Error loading agreements from localStorage:', error);
    // If there's an error, clear the localStorage to start fresh
    localStorage.removeItem('mock-agreements');
  }
  return [];
};

// Helper function to save agreements to storage
const saveAgreementsToStorage = (agreements: Agreement[]) => {
  try {
    console.log(`Saving ${agreements.length} agreements to localStorage`);
    localStorage.setItem('mock-agreements', JSON.stringify(agreements));
  } catch (error) {
    console.error('Error saving agreements to localStorage:', error);
  }
};

// Default agreements for first-time use


// Initialize the mock database with stored agreements or defaults
console.log('Initializing mock database');
const storedAgreements = loadAgreementsFromStorage();
let initialAgreements: Agreement[];

if (storedAgreements.length > 0) {
  console.log(`Using ${storedAgreements.length} agreements from localStorage`);
  initialAgreements = storedAgreements;
} else {
  console.log('No stored agreements found, using default sample agreements');
  initialAgreements = defaultAgreements;
  // Save the default agreements to localStorage for future use
  saveAgreementsToStorage(defaultAgreements);
}

const mockDatabase: { agreements: Agreement[] } = {
  agreements: initialAgreements
};

// Mock keypair for demo purposes (would come from zkLogin in real app)
export const generateKeypair = () => {
  return Ed25519Keypair.generate();
};

// Mock function for creating an agreement on chain
export async function createAgreement(
  title: string,
  description: string,
  fileHash: string,
  creator: string,
  expiryDate?: string
): Promise<string> {
  console.log('Creating agreement on chain:', { title, description, fileHash, creator, expiryDate });
  
  // For demo, generate a random object ID
  const agreementId = `0x${Math.floor(Math.random() * 10000000000000000).toString(16)}`;
  
  // Create the agreement in our mock data with DRAFT status
  const expiryTimestamp = expiryDate 
    ? new Date(expiryDate).getTime() 
    : (new Date().getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days from now

  // Save to localStorage for persistence
  saveAgreementsToStorage(mockDatabase.agreements);
  
  console.log(`Created new agreement with ID: ${agreementId} in DRAFT status`);
  return agreementId;
}

// Mock function for sending an agreement to a recipient
export async function sendAgreement(
  agreementId: string,
  recipient: string,
  signer: string,
  expiryDate?: string,
  signatureAreas?: SignerArea[]
): Promise<boolean> {
  console.log('Sending agreement on chain:', { agreementId, recipient, signer, expiryDate, signatureAreas });
  
  // Find the agreement in our mock database
  const agreement = mockDatabase.agreements.find(a => a.id === agreementId);
  
  if (agreement) {
    agreement.status = AgreementStatus.PENDING;
    // Always keep recipient for legacy, but also ensure all signers are in signer_areas
    agreement.recipient = recipient;

    // If signatureAreas provided, merge with existing signer_areas to avoid duplicates
    if (signatureAreas && signatureAreas.length > 0) {
      // Remove any existing areas for this recipient to avoid duplicates
      agreement.signer_areas = [
        ...agreement.signer_areas.filter(area => area.signer !== recipient),
        ...signatureAreas
      ];
    } else if (!agreement.signer_areas || agreement.signer_areas.length === 0) {
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
    } else {
      // If already has signer_areas, ensure recipient is included
      if (!agreement.signer_areas.some(area => area.signer === recipient)) {
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
    }

    // Set expiry date if provided
    if (expiryDate) {
      agreement.expiresAt = new Date(expiryDate).getTime();
    } else {
      // Default: 30 days from now
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      agreement.expiresAt = thirtyDaysFromNow.getTime();
    }
    
    // Save changes to localStorage
    saveAgreementsToStorage(mockDatabase.agreements);
    
    console.log('Updated agreement with recipient and expiry date:', agreement);
  }
  
  return true;
}

// Mock function for signing an agreement
export async function signAgreement(
  agreementId: string,
  signer: string
): Promise<boolean> {
  console.log('Signing agreement on chain:', { agreementId, signer });
  
  // Find the agreement in our mock database
  const agreement = mockDatabase.agreements.find(a => a.id === agreementId);
  
  if (agreement) {
    // Update the signing status based on who is signing
    if (agreement.creator === signer) {
      agreement.signedByCreator = true;
    } else if (agreement.recipient === signer) {
      agreement.signedByRecipient = true;
    }
    
    // If both parties have signed, update the status
    if (agreement.signedByCreator && agreement.signedByRecipient) {
      agreement.status = AgreementStatus.SIGNED;
    }
    
    // Save changes to localStorage
    saveAgreementsToStorage(mockDatabase.agreements);
    
    console.log(`Updated agreement ${agreementId} signing status`);
  }
  
  return true;
}

// Mock function to fetch a single agreement by ID
export async function fetchAgreementById(id: string): Promise<Agreement | null> {
  console.log('Fetching agreement by ID:', id);
  
  if (!id) {
    console.error('Invalid agreement ID: empty or undefined');
    return null;
  }
  
  // Debug: Log all agreements in the database to help diagnose issues
  console.log('Available agreements:', mockDatabase.agreements.map(a => ({ id: a.id, title: a.title, status: a.status })));
  
  const agreement = mockDatabase.agreements.find(a => a.id === id);
  
  if (!agreement) {
    console.error(`Agreement with ID ${id} not found in database`);
    return null;
  }
  
  console.log('Found agreement:', agreement);
  // Remove any fileUrl from example.com or fake data URL
  const cleanAgreement = { ...agreement };
  if (cleanAgreement.fileUrl && cleanAgreement.fileUrl.startsWith('http')) {
    cleanAgreement.fileUrl = '';
  }
  return cleanAgreement;
}

// Add a helper to get the real data URL for a Walrus blobId
export async function getAgreementFileDataUrl(fileHash: string): Promise<string> {
  if (!fileHash) return '';
  const { getDocumentDataUrl } = await import('./documentUtils');
  return await getDocumentDataUrl(fileHash);
}

// Upload a file to Walrus storage
export async function uploadFileToWalrus(file: File): Promise<string> {
  console.log('Uploading file to Walrus:', file.name);
  
  // Import the necessary utilities here to avoid circular dependencies
  const { uploadAgreementToWalrus } = await import('../services/walrusService');
  const { fileToArrayBuffer } = await import('../utils/fileUtils');

  try {
    // Convert the File to an ArrayBuffer
    const fileBuffer = await fileToArrayBuffer(file);
    console.log('File converted to ArrayBuffer successfully:', file.name, 'size:', fileBuffer.byteLength);

    // Get the current user's session
    // In a production app, we should get the real ZkLoginAccount here
    // For demo, we'll use a simpler approach since full zkLogin isn't implemented
    // const { zkLoginAccount } = window.__userContext || {};
    
    // TODO: Replace with actual ZkLoginAccount for production
    const mockZkLoginSigner = {
      performSignature: async (_txBytes: Uint8Array) => {
        // Ignore txBytes parameter in the mock implementation
        return 'MOCKED_SIGNATURE';
      },
      getAddress: () => '0x1234567890abcdef',
      // Add any other methods required by the Walrus client
    };
    
    // Upload the file to Walrus with a 10 epoch storage duration
    const blobId = await uploadAgreementToWalrus(fileBuffer, mockZkLoginSigner, 10);
    console.log('File uploaded to Walrus successfully, blobId:', blobId);
    return blobId;
  } catch (error) {
    console.error('Error uploading file to Walrus:', error);
    throw new Error(`Failed to upload file to storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

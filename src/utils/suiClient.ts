import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Agreement, AgreementStatus } from '../types';

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
      a.creator === 'ANY_ADDRESS' || 
      a.recipient === address || 
      a.recipient === 'ANY_ADDRESS'
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
const defaultAgreements: Agreement[] = [
  {
    id: '0x1234567890abcdef',
    title: 'Consulting Agreement',
    description: 'Service agreement for software development consulting',
    fileHash: 'bafybeihegqxct3kfkyw6k7brszgouqmm2ozxs6daoswdkce373wbfseqxa',
    fileName: 'consulting_agreement.pdf',
    fileUrl: 'https://example.com/files/consulting_agreement.pdf',
    creator: 'ANY_ADDRESS',
    recipient: '0xabcdef1234567890',
    signedByCreator: true,
    signedByRecipient: false,
    status: AgreementStatus.PENDING,
    createdAt: Date.now() - 86400000, // 1 day ago
    isPublic: false,
    expiresAt: Date.now() + 2592000000, // 30 days from now
    feePaid: true,
    signer_areas: []
  },
  {
    id: '0xabcdef1234567890',
    title: 'Employment Contract',
    description: 'Full-time employment agreement with standard terms',
    fileHash: 'bafybeig4vw7duavkpenht6pk4m6zkzbvjgydltwz7s77pgozf3ixjh4jri',
    fileName: 'employment_contract.pdf',
    fileUrl: 'https://example.com/files/employment_contract.pdf',
    creator: '0x5678901234abcdef',
    recipient: 'ANY_ADDRESS',
    signedByCreator: true,
    signedByRecipient: false,
    status: AgreementStatus.PENDING,
    createdAt: Date.now() - 172800000, // 2 days ago
    isPublic: false,
    expiresAt: Date.now() + 1296000000, // 15 days from now
    feePaid: true,
    signer_areas: []
  },
  {
    id: '0x0987654321fedcba',
    title: 'NDA Agreement',
    description: 'Non-disclosure agreement for project Alpha',
    fileHash: 'bafybeih4i7kee6oe5t76tyzxan5mpeg6e56qpv5q6l3a2im563gwjtq7im',
    fileName: 'nda_alpha.pdf',
    fileUrl: 'https://example.com/files/nda_alpha.pdf',
    creator: 'ANY_ADDRESS',
    recipient: undefined,
    signedByCreator: false,
    signedByRecipient: false,
    status: AgreementStatus.DRAFT,
    createdAt: Date.now() - 259200000, // 3 days ago
    isPublic: false,
    expiresAt: Date.now() + 3888000000, // 45 days from now
    feePaid: false,
    signer_areas: []
  },
  {
    id: '0xfedcba0987654321',
    title: 'Partnership Agreement',
    description: 'Terms for joint venture between Company A and Company B',
    fileHash: 'bafybeiadpnmoiy4njtwxc5c7psije2nhs7jvhpwzigj5qedsyrgwn6o2r4',
    fileName: 'partnership_agreement.pdf',
    fileUrl: 'https://example.com/files/partnership_agreement.pdf',
    creator: '0x1111222233334444',
    recipient: 'ANY_ADDRESS',
    signedByCreator: true,
    signedByRecipient: true,
    status: AgreementStatus.SIGNED,
    createdAt: Date.now() - 345600000, // 4 days ago
    isPublic: false,
    expiresAt: Date.now() + 5184000000, // 60 days from now
    feePaid: true,
    signer_areas: []
  }
];

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
  
  // Add the new agreement to mock database
  mockDatabase.agreements.push({
    id: agreementId,
    title,
    description,
    fileHash,
    fileName: `agreement-${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    fileUrl: `https://example.com/files/${fileHash}.pdf`,
    creator,
    status: AgreementStatus.DRAFT, // Always start as DRAFT
    createdAt: Date.now(),
    expiresAt: expiryTimestamp,
    isPublic: false,
    feePaid: false,
    signer_areas: []
  });
  
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
  expiryDate?: string
): Promise<boolean> {
  console.log('Sending agreement on chain:', { agreementId, recipient, signer, expiryDate });
  
  // Find the agreement in our mock database
  const agreement = mockDatabase.agreements.find(a => a.id === agreementId);
  
  if (agreement) {
    // Update the agreement status and add recipient
    agreement.status = AgreementStatus.PENDING;
    agreement.recipient = recipient;
    
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

// Remove the duplicate fetchAgreementsForUser implementation below
// Mock function to fetch agreements for a user
// export async function fetchAgreementsForUser(address: string): Promise<Agreement[]> {
//   console.log('Fetching agreements for address:', address);
//   // Return a copy of agreements relevant to the user (created by them or where they are a recipient)
//   return mockDatabase.agreements
//     .filter(a => a.creator === address || a.creator === 'ANY_ADDRESS' || a.recipient === address || a.recipient === 'ANY_ADDRESS')
//     .map(a => ({...a})); // Return a copy to prevent direct mutations
// }

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
  return {...agreement}; // Return a copy to prevent direct mutations
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
    return blobId;
  } catch (error) {
    console.error('Error uploading file to Walrus:', error);
    throw error;
  }
}

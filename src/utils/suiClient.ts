import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Agreement, AgreementStatus } from '../types';

// In a real app, this would come from environment variables
const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK;
const AGREEMENT_PACKAGE = 'PACKAGE_ID_PLACEHOLDER'; // We'll use a placeholder for demo purposes
const AGREEMENT_MODULE = 'agreements';

// Use the correct RPC URL for SuiClient
const SUI_RPC_URL = import.meta.env.VITE_SUI_FULLNODE_RPC_URL || getFullnodeUrl('devnet');
export const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Mock keypair for demo purposes (would come from zkLogin in real app)
export const generateKeypair = () => {
  return Ed25519Keypair.generate();
};

// Mock function for creating an agreement on chain
export async function createAgreement(
  title: string,
  description: string,
  fileHash: string,
  signer: string
): Promise<string> {
  console.log('Creating agreement on chain:', { title, description, fileHash, signer });
  
  // In a real implementation, this would create a transaction block
  // and send it to the Sui network
  
  // For demo, generate a random object ID
  const agreementId = `0x${Math.floor(Math.random() * 10000000000000000).toString(16)}`;
  
  return agreementId;
}

// Mock function for sending an agreement to a recipient
export async function sendAgreement(
  agreementId: string,
  recipient: string,
  signer: string
): Promise<boolean> {
  console.log('Sending agreement on chain:', { agreementId, recipient, signer });
  return true;
}

// Mock function for signing an agreement
export async function signAgreement(
  agreementId: string,
  signer: string
): Promise<boolean> {
  console.log('Signing agreement on chain:', { agreementId, signer });
  return true;
}

// Mock function to fetch agreements for a user
export async function fetchAgreementsForUser(address: string): Promise<Agreement[]> {
  console.log('Fetching agreements for address:', address);
  
  // Mock data for demonstration purposes
  const mockAgreements: Agreement[] = [
    {
      id: '0x1234567890abcdef',
      title: 'Consulting Agreement',
      description: 'Service agreement for software development consulting',
      fileHash: 'bafybeihegqxct3kfkyw6k7brszgouqmm2ozxs6daoswdkce373wbfseqxa',
      fileName: 'consulting_agreement.pdf',
      fileUrl: 'https://example.com/files/consulting_agreement.pdf',
      creator: address,
      recipient: '0xabcdef1234567890',
      signedByCreator: true,
      signedByRecipient: false,
      status: AgreementStatus.PENDING,
      createdAt: Date.now() - 86400000 // 1 day ago
    },
    {
      id: '0xabcdef1234567890',
      title: 'Employment Contract',
      description: 'Full-time employment agreement with standard terms',
      fileHash: 'bafybeig4vw7duavkpenht6pk4m6zkzbvjgydltwz7s77pgozf3ixjh4jri',
      fileName: 'employment_contract.pdf',
      fileUrl: 'https://example.com/files/employment_contract.pdf',
      creator: '0x5678901234abcdef',
      recipient: address,
      signedByCreator: true,
      signedByRecipient: false,
      status: AgreementStatus.PENDING,
      createdAt: Date.now() - 172800000 // 2 days ago
    },
    {
      id: '0x0987654321fedcba',
      title: 'NDA Agreement',
      description: 'Non-disclosure agreement for project Alpha',
      fileHash: 'bafybeih4i7kee6oe5t76tyzxan5mpeg6e56qpv5q6l3a2im563gwjtq7im',
      fileName: 'nda_alpha.pdf',
      fileUrl: 'https://example.com/files/nda_alpha.pdf',
      creator: address,
      recipient: undefined,
      signedByCreator: false,
      signedByRecipient: false,
      status: AgreementStatus.DRAFT,
      createdAt: Date.now() - 259200000 // 3 days ago
    },
    {
      id: '0xfedcba0987654321',
      title: 'Partnership Agreement',
      description: 'Terms for joint venture between Company A and Company B',
      fileHash: 'bafybeiadpnmoiy4njtwxc5c7psije2nhs7jvhpwzigj5qedsyrgwn6o2r4',
      fileName: 'partnership_agreement.pdf',
      fileUrl: 'https://example.com/files/partnership_agreement.pdf',
      creator: '0x1111222233334444',
      recipient: address,
      signedByCreator: true,
      signedByRecipient: true,
      status: AgreementStatus.SIGNED,
      createdAt: Date.now() - 345600000 // 4 days ago
    }
  ];
  
  return mockAgreements;
}

// Mock function to fetch a single agreement by ID
export async function fetchAgreementById(id: string): Promise<Agreement | null> {
  console.log('Fetching agreement by ID:', id);
  
  const allAgreements = await fetchAgreementsForUser('ANY_ADDRESS');
  const agreement = allAgreements.find(a => a.id === id);
  
  return agreement || null;
}

// Mock function to upload a file to Walrus
export async function uploadFileToWalrus(file: File): Promise<string> {
  console.log('Uploading file to Walrus:', file.name);
  
  // Simulate uploading and getting a CID
  // In a real app, this would call the Walrus API
  return `bafybei${Math.random().toString(36).substring(2, 30)}`;
}
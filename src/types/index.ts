// Agreement status constants
export enum AgreementStatus {
  DRAFT = 0, // Matches 'Draft' in Move enum
  PENDING = 1, // Matches 'Pending'
  SIGNED = 2, // Matches 'Signed'
  EXPIRED = 3, // Matches 'Expired'
  REJECTED = 4, // Matches 'Rejected'
}

// SignerArea type for signature areas in documents
export interface SignerArea {
  signer: string; // address
  page: number; // u64
  x: number; // u64
  y: number; // u64
  width: number; // u64
  height: number; // u64
  inputType: number; // u8, 0 = text, 1 = image
  value: number[]; // vector<u8>, signature hash or value
  signed: boolean;
  rejected: boolean;
  fee_paid?: boolean; // Optional field for fee payment status
  signature_blob_id?: string; // Walrus blob ID for this signature
}

// Agreement type from the smart contract
export interface Agreement {
  id: string; // UID as string
  creator: string; // address
  title: string; // vector<u8> to string
  description: string; // vector<u8> to string
  fileHash: string; // vector<u8> to string (hex or base64)
  fileUrl: string; // vector<u8> to string
  signer_areas: SignerArea[]; // vector<SignerArea>
  status: AgreementStatus; // Corresponds to the Status enum
  createdAt: number; // u64 timestamp
  isPublic: boolean;
  feePaid: boolean;
  expiresAt: number; // u64 timestamp
  // Optional fields for UI functionality
  fileName?: string;
  recipient?: string; // Recipient address for pending agreements
  signedByCreator?: boolean; // Whether creator has signed
  signedByRecipient?: boolean; // Whether recipient has signed
}

// User type for the application
export interface User {
  address: string;
  name?: string;
  email?: string;
  profilePic?: string;
  isAuthenticated: boolean;
}

// zkLogin session info
export interface ZkLoginSession {
  jwt?: string;
  address?: string;
  ephemeralKeyPair?: {
    publicKey: string;
    privateKey: string;
  };
  userSignature?: string;
}
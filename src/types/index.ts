// Agreement status constants
export enum AgreementStatus {
  DRAFT = 0,
  PENDING = 1, 
  SIGNED = 2
}

// Agreement type from the smart contract
export interface Agreement {
  id: string;
  title: string;
  description: string;
  fileHash: string;
  fileName?: string;
  fileUrl?: string;
  creator: string;
  recipient?: string; 
  signedByCreator: boolean;
  signedByRecipient: boolean;
  status: AgreementStatus;
  createdAt: number;
  isPublic: boolean;
  signature?: {
    dataUrl: string;
    position: { x: number; y: number };
    page: number;
  };
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
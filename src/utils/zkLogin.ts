/* eslint-disable @typescript-eslint/no-unused-vars */
import { 
  genAddressSeed, 
  jwtToAddress 
} from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { toB64 } from '@mysten/sui/utils';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { suiClient } from './suiClient';
import { Signer, SignatureWithBytes } from '@mysten/sui/cryptography';
import { SignatureScheme } from '@mysten/sui/cryptography';
import { PublicKey } from '@mysten/sui/cryptography';
import { IntentScope } from '@mysten/sui/cryptography';
import { debugLog } from './debug';

/**
 * Generates a deterministic salt based on user identifier.
 * Uses a simple hash function to create a consistent salt for the same user.
 * 
 * @param userIdentifier The unique identifier for the user (e.g., JWT sub claim)
 * @returns A deterministic salt as a string
 */
export function generateDeterministicSalt(userIdentifier: string): string {
  if (!userIdentifier) {
    return '10000'; // A simple default
  }
  
  // Normalize the identifier to prevent case sensitivity issues
  const normalizedId = userIdentifier.toLowerCase().trim();
  
  // Create a consistent salt from the user identifier
  // This is a simple string-based hash that works well with BigInt
  let hashValue = 0;
  
  // Simple string hash algorithm (djb2)
  for (let i = 0; i < normalizedId.length; i++) {
    const char = normalizedId.charCodeAt(i);
    hashValue = ((hashValue << 5) - hashValue) + char;
    hashValue = hashValue & hashValue; // Convert to 32bit integer
  }
  
  // Ensure positive value
  const positiveHash = Math.abs(hashValue);
  
  // Add a secondary hash to reduce collision possibility
  // but still remain deterministic
  const secondaryHash = normalizedId
    .split('')
    .reduce((a, b) => (a * 31 + b.charCodeAt(0)) & 0x7fffffff, 0);
  
  // Combine the hashes to form a more unique value
  const combinedHash = positiveHash.toString() + secondaryHash.toString();
  
  // Ensure the salt is in the correct range for zkLogin (fits within a 256-bit unsigned integer)
  // Add a small constant to avoid potential issues with zero
  const salt = BigInt(combinedHash) % BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF') + BigInt(1);
  
  return salt.toString();
}

/**
 * For backward compatibility
 */
export const generateSalt = generateDeterministicSalt;

/**
 * Restore the ephemeral keypair from session storage
 * 
 * @returns The restored keypair or null if not found
 */
export const restoreEphemeralKeyPair = (): Ed25519Keypair | null => {
  try {
    const storedSeedString = localStorage.getItem('ephemeralSeed');
    if (!storedSeedString) {
      return null;
    }
    
    // Parse the stored seed bytes
    const seedBytes = new Uint8Array(JSON.parse(storedSeedString));
    
    // Recreate the keypair from the seed
    return Ed25519Keypair.fromSecretKey(seedBytes);
  } catch {
    return null;
  }
};

/**
 * Resolves a Gmail address to a Sui address by using deterministic salt generation
 * 
 * @param email The email address to resolve (must be a Gmail address)
 * @returns The Sui address associated with this email, or null if not resolvable
 */
export async function resolveGmailToSuiAddress(email: string): Promise<string | null> {
  try {
    // Only support Gmail addresses for now
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      return null;
    }
    
    // Extract the username part of the email
    const username = email.split('@')[0].toLowerCase();
    
    // Use the email username as the sub identifier
    // This is critical - we need to use exactly the same identifier that Google would use in the JWT
    // However, since we don't have access to the actual JWT, we use the email username as an approximation
    const deterministicSalt = generateDeterministicSalt(username);
    
    // Load and check debug address map for cached results
    const addressMap = JSON.parse(localStorage.getItem('debug-address-map') || '{}');
    
    // Check if we have a cached address for this salt
    if (addressMap[deterministicSalt]) {
      return addressMap[deterministicSalt];
    }
    
    // Create a minimal JWT-like structure with the username as the sub
    // This is just for interacting with jwtToAddress
    const mockJwt = `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIke3VzZXJuYW1lfSIsImlzcyI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbSJ9.signature`;
    
    // Use our getSuiAddressFromJwt function with the deterministic salt
    const address = getSuiAddressFromJwt(mockJwt, deterministicSalt, 'sub');
    
    if (address) {
      // Cache this address for future use
      addressMap[deterministicSalt] = address;
      localStorage.setItem('debug-address-map', JSON.stringify(addressMap));
    }
    
    return address;
  } catch (_) {
    return null;
  }
}

/**
 * Get a Sui address from a JWT token with optional salt
 * 
 * @param jwt The JWT token
 * @param salt Optional salt to use
 * @param _keyClaimName The JWT claim that contains the key (default: 'sub')
 * @returns The Sui address
 */
export function getSuiAddressFromJwt(
  jwt: string,
  salt?: string,
  _keyClaimName?: string
): string | null {
  try {
    // If no salt was provided, use a default
    const useSalt = salt || '0';
    
    // Convert the salt to a BigInt
    let saltBigInt;
    try {
      saltBigInt = BigInt(useSalt);
    } catch {
      saltBigInt = BigInt(0);
    }
    
    // Get the address from the JWT
    const address = jwtToAddress(jwt, saltBigInt);
    return address;
  } catch {
    return null;
  }
}

/**
 * ZkLoginAccount class to handle zkLogin operations
 * Implements the Signer interface for the Sui SDK
 */
export class ZkLoginAccount implements Signer {
  ephemeralKeyPair: Ed25519Keypair;
  jwt: string;
  salt: string;
  address: string;
  userIdentifier: string;
  proverUrl: string;
  keyClaimName: string;
  isInitialized: boolean = false;
  // Using a more specific type to avoid 'any'
  zkProof: Record<string, unknown> | null = null;
  
  // Required property for Signer interface
  readonly publicKey: Uint8Array;

  /**
   * Create a ZkLoginAccount instance
   * 
   * @param params Configuration parameters
   */
  constructor(params: {
    ephemeralKeyPair: Ed25519Keypair;
    jwt: string;
    salt: string;
    userIdentifier: string;
    proverUrl: string;
    keyClaimName?: string;
  }) {
    this.ephemeralKeyPair = params.ephemeralKeyPair;
    this.jwt = params.jwt;
    
    // Store the user identifier for future use
    this.userIdentifier = params.userIdentifier;
    this.proverUrl = params.proverUrl;
    this.keyClaimName = params.keyClaimName || 'sub';
    
    // Initialize the public key from the ephemeral keypair
    this.publicKey = this.ephemeralKeyPair.getPublicKey().toSuiBytes();
    
    // Validate and set the salt
    try {
      // If salt is falsy, regenerate it deterministically from the user identifier
      if (!params.salt) {
        this.salt = generateDeterministicSalt(this.userIdentifier);
      } else {
        // Check if salt is a valid BigInt
        BigInt(params.salt);
        this.salt = params.salt;
      }
    } catch {
      this.salt = generateDeterministicSalt(this.userIdentifier);
    }
    
    // Derive the address from JWT and salt
    const derivedAddress = getSuiAddressFromJwt(this.jwt, this.salt, this.keyClaimName);
    if (!derivedAddress) {
      throw new Error('Failed to derive Sui address from JWT and salt');
    }
    
    this.address = derivedAddress;
  }

  /**
   * Initialize the account by fetching the ZK proof
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const addressSeed = genAddressSeed(
      BigInt(this.salt),
      this.keyClaimName,
      this.userIdentifier,
      'https://accounts.google.com' // Add issuer parameter required by latest SDK
    ).toString();

    try {
      // Fetch the ZK proof
      const zkProofResponse = await fetch(this.proverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jwt: this.jwt,
          extendedEphemeralPublicKey: this.ephemeralKeyPair.getPublicKey().toSuiBytes(),
          maxEpoch: await this.getMaxEpoch(),
          jwtRandomness: addressSeed,
          keyClaimName: this.keyClaimName,
        }),
      });

      if (!zkProofResponse.ok) {
        const errorText = await zkProofResponse.text();
        throw new Error(`Failed to get ZK proof: ${errorText}`);
      }

      this.zkProof = await zkProofResponse.json();
      this.isInitialized = true;
      
      // Store the proof in localStorage for session persistence
      localStorage.setItem('zklogin-proof', JSON.stringify(this.zkProof));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the maximum epoch for the proof
   */
  private async getMaxEpoch(): Promise<number> {
    try {
      const { epoch } = await suiClient.getLatestSuiSystemState();
      // Use a reasonably long validity period for the proof
      return Number(epoch) + 10;
    } catch {
      return 10; // Fallback default
    }
  }

  /**
   * Sign arbitrary data
   * Required method for Signer interface
   */
  async sign(data: Uint8Array): Promise<Uint8Array> {
    // Use the ephemeral keypair to sign the data
    return this.ephemeralKeyPair.sign(data);
  }

  /**
   * Sign data with intent (includes a domain separator in the signature)
   * Required method for Signer interface
   */
  async signWithIntent(data: Uint8Array, _unused: IntentScope): Promise<SignatureWithBytes> {
    // In zkLogin, we delegate to the ephemeral keypair to sign the data
    // The intent parameter is intentionally not used as zkLogin has its own signature scheme
    const signature = await this.ephemeralKeyPair.sign(data);
    
    // Return in the format expected by the Signer interface
    return {
      signature: toB64(signature),
      bytes: toB64(data)
    };
  }

  /**
   * Sign a personal message
   * Required method for Signer interface
   */
  async signPersonalMessage(message: Uint8Array): Promise<{ signature: string; bytes: string }> {
    // In zkLogin, we delegate to the ephemeral keypair
    const signature = await this.ephemeralKeyPair.sign(message);
    
    return {
      signature: toB64(signature),
      bytes: toB64(message)
    };
  }

  /**
   * Get the Sui address of this signer
   * Required method for Signer interface
   */
  toSuiAddress(): string {
    return this.address;
  }

  /**
   * Get the key scheme of the keypair
   * Required method for Signer interface
   */
  getKeyScheme(): SignatureScheme {
    return this.ephemeralKeyPair.getKeyScheme();
  }

  /**
   * Get the public key
   * Required method for Signer interface
   */
  getPublicKey(): PublicKey {
    return this.ephemeralKeyPair.getPublicKey();
  }

  /**
   * Required method for Signer interface
   * Sign a transaction block and return the signature
   */
  async signTransactionBlock(transaction: Uint8Array): Promise<{ signature: string }> {
    if (!this.isInitialized || !this.zkProof) {
      throw new Error('Account not initialized. Call initialize() first.');
    }

    // Sign with ephemeral key
    const signature = await this.ephemeralKeyPair.sign(transaction);

    // Create a zkLogin signature
    const zkLoginSignature = {
      inputs: {
        ...this.zkProof,
        addressSeed: genAddressSeed(
          BigInt(this.salt),
          this.keyClaimName,
          this.userIdentifier,
          'https://accounts.google.com' // Add issuer parameter required by latest SDK
        ).toString(),
      },
      signature: toB64(signature),
      maxEpoch: this.zkProof.maxEpoch,
    };

    // Return the signature in the expected format
    return {
      signature: JSON.stringify(zkLoginSignature),
    };
  }
  
  /**
   * Implementation of signTransaction required by Signer interface
   */
  async signTransaction(bytes: Uint8Array): Promise<SignatureWithBytes> {
    // For zkLogin, we use the same signing method since we're 
    // not actually using intent prefixing - zkLogin has its own proof
    const signature = await this.ephemeralKeyPair.sign(bytes);
    
    return {
      signature: toB64(signature),
      bytes: toB64(bytes)
    };
  }
  
  /**
   * Execute a transaction using the zkLogin account
   * This method executes the transaction directly on the client
   * 
   * @param transaction Transaction to sign and execute
   * @param client Sui client instance
   * @returns Transaction response
   */
  async executeTransactionBlock(
    transaction: Transaction,
    client: SuiClient = suiClient
  ) {
    if (!this.isInitialized || !this.zkProof) {
      throw new Error('Account not initialized. Call initialize() first.');
    }

    // Build the transaction
    const builtTxn = await transaction.build({ client });
    
    // Get the signature from our signTransactionBlock method
    const { signature } = await this.signTransactionBlock(builtTxn);

    // Execute the transaction with the signature directly
    return await client.executeTransactionBlock({
      transactionBlock: builtTxn,
      signature: [signature], // Wrap in array for the latest SDK
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
  }
  
  /**
   * Get the key pair for compatibility with old code
   */
  getKeyPair(): this {
    return this;
  }

  /**
   * Attempt to restore a previously initialized state from localStorage
   * This is useful for maintaining session persistence across page reloads
   * 
   * @returns true if state was successfully restored, false otherwise
   */
  restoreFromStorage(): boolean {
    try {
      const storedProof = localStorage.getItem('zklogin-proof');
      if (storedProof) {
        this.zkProof = JSON.parse(storedProof);
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Static method to create a ZkLoginAccount from stored localStorage data
   * This provides a centralized way to reconstruct an account from storage
   * 
   * @returns ZkLoginAccount instance or null if reconstruction fails
   */
  static fromStorage(): ZkLoginAccount | null {
    try {
      // Check if we have all necessary data in localStorage
      const jwt = localStorage.getItem('zklogin-jwt');
      const salt = localStorage.getItem('zklogin-user-salt');
      const ephemeralSeedStr = localStorage.getItem('ephemeralSeed');
      const zkProofStr = localStorage.getItem('zklogin-proof');
      
      // We need at minimum the JWT, salt and ephemeral key to reconstruct
      if (!jwt || !salt || !ephemeralSeedStr) {
        debugLog('Missing required authentication data', { 
          hasJwt: !!jwt, 
          hasSalt: !!salt, 
          hasEphemeralSeed: !!ephemeralSeedStr 
        });
        return null;
      }
      
      // Reconstruct the ephemeral keypair
      try {
        const seedBytes = new Uint8Array(JSON.parse(ephemeralSeedStr));
        const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(seedBytes);
        
        // Extract user identifier from JWT
        let userIdentifier = '';
        try {
          const decodedJwt = JSON.parse(atob(jwt.split('.')[1]));
          userIdentifier = decodedJwt.sub || '';
        } catch {
          // If we can't decode the JWT, create a placeholder identifier
          userIdentifier = 'unknown-user';
        }
        
        // Create the account
        const proverUrl = import.meta.env.VITE_ZK_LOGIN_PROVER_URL;
        const account = new ZkLoginAccount({
          ephemeralKeyPair,
          jwt,
          salt,
          userIdentifier,
          proverUrl,
          keyClaimName: 'sub'
        });
        
        // Restore proof if available
        if (zkProofStr) {
          try {
            account.zkProof = JSON.parse(zkProofStr);
            account.isInitialized = true;
          } catch (error) {
            debugLog('Failed to parse proof', { error: String(error) });
            // Failed to parse proof, but we can continue with the account
          }
        }
        
        // Validate the reconstructed account
        if (!account.validateSession()) {
          debugLog('Account validation failed');
          return null;
        }
        
        debugLog('Successfully reconstructed account from storage', { 
          address: account.address,
          hasProof: !!account.zkProof
        });
        
        return account;
      } catch (error) {
        debugLog('Error reconstructing keypair', { error: String(error) });
        return null;
      }
    } catch (error) {
      debugLog('Error in fromStorage', { error: String(error) });
      return null;
    }
  }

  /**
   * Validate that the account has all required data for authentication
   * 
   * @returns true if account is valid and has all required data, false otherwise
   */
  validateSession(): boolean {
    // Check for essential components of a valid session
    if (!this.ephemeralKeyPair) {
      debugLog('Missing ephemeral keypair');
      return false;
    }
    
    if (!this.jwt) {
      debugLog('Missing JWT');
      return false;
    }
    
    if (!this.salt) {
      debugLog('Missing salt');
      return false;
    }
    
    if (!this.userIdentifier) {
      debugLog('Missing user identifier');
      return false;
    }
    
    // Check that address is properly derived
    try {
      const derivedAddress = getSuiAddressFromJwt(this.jwt, this.salt, this.keyClaimName);
      if (derivedAddress !== this.address) {
        debugLog('Address mismatch', { 
          stored: this.address, 
          derived: derivedAddress 
        });
        return false;
      }
    } catch (error) {
      debugLog('Error validating address', { error: String(error) });
      return false;
    }
    
    return true;
  }

  /**
   * Verify that we have a complete and valid proof
   * @returns true if proof is valid, false otherwise
   */
  verifyProof(): boolean {
    if (!this.zkProof) return false;
    
    try {
      // Basic validation of proof structure
      const requiredFields = ['inputs', 'maxEpoch', 'bulletinTime', 'epoch'];
      for (const field of requiredFields) {
        if (!(field in this.zkProof)) {
          debugLog(`Missing proof field: ${field}`);
          return false;
        }
      }
      
      // The proof is present and appears to be structurally valid
      return true;
    } catch (error) {
      debugLog('Error verifying proof', { error: String(error) });
      return false;
    }
  }
}

/**
 * Utility to check the integrity of our localStorage authentication data
 * and repair any inconsistencies between JWT, salt, and user object
 * 
 * @returns true if integrity check passed (or was repaired), false if there are unrecoverable issues
 */
export function verifyAuthStorageIntegrity(): boolean {
  try {
    // Step 1: Check for presence of critical auth data
    const jwt = localStorage.getItem('zklogin-jwt');
    const salt = localStorage.getItem('zklogin-user-salt');
    const ephemeralSeedStr = localStorage.getItem('ephemeralSeed');
    const userStr = localStorage.getItem('user');
    
    // If we're missing all auth data, that's normal when logged out
    if (!jwt && !salt && !ephemeralSeedStr && !userStr) {
      return true;
    }
    
    // Step 2: If we have partial auth data, check if we can recover
    if (!jwt || !salt || !ephemeralSeedStr) {
      // Missing critical auth data, can't recover
      debugLog('Missing critical auth data', {
        hasJwt: !!jwt,
        hasSalt: !!salt,
        hasEphemeralSeed: !!ephemeralSeedStr
      });
      
      // If we have a user object but missing auth data,
      // the user object should be cleared
      if (userStr) {
        localStorage.removeItem('user');
      }
      
      return false;
    }
    
    // Step 3: Verify user object matches the address derived from JWT and salt
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      
      // If missing user object but have other auth data,
      // try to recreate user object
      if (!user || !user.address) {
        // Attempt to derive the address
        const derivedAddress = getSuiAddressFromJwt(jwt, salt, 'sub');
        if (derivedAddress) {
          const newUser = {
            address: derivedAddress,
            name: 'Sui User',
            isAuthenticated: true
          };
          localStorage.setItem('user', JSON.stringify(newUser));
          debugLog('Repaired missing user object', { address: derivedAddress });
        } else {
          return false;
        }
      } else {
        // We have a user object, verify address matches what's derived from JWT and salt
        const derivedAddress = getSuiAddressFromJwt(jwt, salt, 'sub');
        if (derivedAddress && derivedAddress !== user.address) {
          // Address mismatch, update user object
          const updatedUser = {
            ...user,
            address: derivedAddress
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          debugLog('Repaired address mismatch', { 
            oldAddress: user.address, 
            newAddress: derivedAddress 
          });
        }
      }
      
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    debugLog('Error verifying auth storage integrity', { error: String(error) });
    return false;
  }
}

import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateRandomness, getZkLoginSignature, jwtToAddress } from '@mysten/sui/zklogin';
import { fromB64 } from '@mysten/sui/utils';

export const generateSalt = (): string => {
  // WARNING: This is a simple way to generate a salt for demonstration.
  // In a production environment, salts should be unique per user and managed securely,
  // ideally by a backend service. Avoid storing sensitive salts directly in localStorage
  // if possible, or ensure they are handled with extreme care.
  return generateRandomness(); 
};

interface ZkLoginProof {
    proofPoints: {
        a: string[];
        b: string[][];
        c: string[];
    };
    addressSeed: string;
    headerBase64: string;
}

interface ZkLoginAccountConstructor {
    client: SuiClient;
    ephemeralKeyPair: Ed25519Keypair;
    jwt: string;
    salt: string;
    userIdentifier: string; // e.g., 'sub' claim from JWT
    proverUrl: string;
    keyClaimName?: 'sub' | 'email'; // Default 'sub'
}

export class ZkLoginAccount {
    private client: SuiClient;
    private ephemeralKeyPair: Ed25519Keypair;
    private jwt: string;
    private salt: string;
    private userIdentifier: string;
    private proverUrl: string;
    private keyClaimName: 'sub' | 'email';

    public address: string;
    private zkProof: ZkLoginProof | null = null;

    constructor(params: ZkLoginAccountConstructor) {
        this.client = params.client;
        this.ephemeralKeyPair = params.ephemeralKeyPair;
        this.jwt = params.jwt;
        this.salt = params.salt;
        this.userIdentifier = params.userIdentifier;
        this.proverUrl = params.proverUrl;
        this.keyClaimName = params.keyClaimName || 'sub';
        this.address = jwtToAddress(this.jwt, this.salt, this.keyClaimName);
    }

    async initialize() {
        // Fetch ZK proof if not already fetched
        if (!this.zkProof) {
            this.zkProof = await this.fetchZkProof();
        }
    }

    private async fetchZkProof(): Promise<ZkLoginProof> {
        const ephemeralPublicKeyB64 = this.ephemeralKeyPair.getPublicKey().toBase64();

        // Retrieve randomness from sessionStorage (not localStorage)
        const storedRandomness = sessionStorage.getItem('randomness');
        if (!storedRandomness) {
            throw new Error("Randomness for nonce not found. Ensure it was set during login.");
        }

        const proofResponse = await fetch(this.proverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jwt: this.jwt,
                extendedEphemeralPublicKey: ephemeralPublicKeyB64,
                maxEpoch: 100, // Should match maxEpoch used for nonce
                jwtRandomness: storedRandomness, 
                salt: this.salt,
                keyClaimName: this.keyClaimName,
            }),
        });

        if (!proofResponse.ok) {
            const errorBody = await proofResponse.text();
            console.error("Prover error response:", errorBody);
            throw new Error(`Failed to fetch ZK proof from prover: ${proofResponse.status} ${errorBody}`);
        }
        const zkProof = await proofResponse.json();
        return zkProof as ZkLoginProof;
    }
    
    getKeyPair(): Ed25519Keypair { // This is a bit of a misnomer for zkLogin, but follows SDK pattern
        return this.ephemeralKeyPair; // The ephemeral keypair signs the transaction
    }

    async getZkLoginSignature(txBytesBase64: string): Promise<string> {
        if (!this.zkProof) {
            this.zkProof = await this.fetchZkProof();
        }

        if (!this.zkProof) { // Double check after attempting fetch
            throw new Error("ZK Proof is not available.");
        }

        const { proofPoints, addressSeed, headerBase64 } = this.zkProof;
        
        return getZkLoginSignature({
            inputs: {
                proofPoints: proofPoints,
                addressSeed: addressSeed,
                headerBase64: headerBase64,
                issBase64Details: {
                    // Add appropriate values for issBase64Details here
                    value: "exampleIssuerBase64", // Replace with actual Base64-encoded issuer value
                    indexMod4: 0, // Replace with the correct indexMod4 value
                },
            },
            maxEpoch: 100, // Should match maxEpoch used for nonce & proof
            userSignature: (await this.ephemeralKeyPair.sign(fromB64(txBytesBase64))),
        });
    }
}


// Helper for older sui.js versions or direct ZK proof fetching if needed outside the class
export const fetchZkLoginProver = async (
    jwt: string,
    ephemeralPublicKeyB64: string,
    maxEpoch: number,
    jwtRandomness: string,
    salt: string,
    proverUrl: string,
    keyClaimName: 'sub' | 'email' = 'sub'
) => {
    const response = await fetch(proverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jwt,
            extendedEphemeralPublicKey: ephemeralPublicKeyB64,
            maxEpoch,
            jwtRandomness,
            salt,
            keyClaimName,
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Prover error response:", errorBody);
        throw new Error(`Failed to fetch ZK proof: ${response.status} ${errorBody}`);
    }
    return response.json();
};
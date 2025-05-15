import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateRandomness, getZkLoginSignature, jwtToAddress } from '@mysten/sui/zklogin';
import { fromB64, toB64 } from '@mysten/sui/utils'; // Added toB64
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, TREASURY_ID, CLOCK_ID } from '../config';
import { Agreement, SignerArea, AgreementStatus } from '../types';

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
    // private clientSui: SuiClient; // Renamed to avoid conflict with class property
    private ephemeralKeyPair: Ed25519Keypair;
    private jwt: string;
    private salt: string;
    // private userIdentifier: string; // Marked as unused, consider if needed for other logic
    private proverUrl: string;
    private keyClaimName: 'sub' | 'email';

    public address: string;
    private zkProof: ZkLoginProof | null = null;

    constructor(params: ZkLoginAccountConstructor) {
        this.clientSui = params.client; // Use the renamed parameter
        this.ephemeralKeyPair = params.ephemeralKeyPair;
        this.jwt = params.jwt;
        this.salt = params.salt;
        // this.userIdentifier = params.userIdentifier; // Marked as unused
        this.proverUrl = params.proverUrl;
        this.keyClaimName = params.keyClaimName || 'sub';
        // Corrected jwtToAddress call. The third argument is `issBase64Details` or a boolean for Enoki flow.
        // If keyClaimName ('sub' or 'email') is used to derive part of the address seed differently
        // than the standard jwtToAddress, this needs custom logic.
        // Assuming standard usage here. If 'iss' is part of your JWT and needs to be passed,
        // you'd extract and Base64 encode it for issBase64Details.
        // For simplicity, if you don't have specific issBase64Details, you might pass undefined or true/false for Enoki.
        // Let's assume for now that the salt and JWT content are sufficient as per standard examples.
        this.address = jwtToAddress(this.jwt, this.salt /*, issBase64DetailsIfAny */);
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
        const zkProofResult = await proofResponse.json();
        // Assuming zkProofResult directly matches ZkLoginProof structure based on your prover
        return zkProofResult as ZkLoginProof; 
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

// Helper to convert string to Uint8Array (for vector<u8>)
const stringToUint8Array = (str: string): number[] => {
  return Array.from(new TextEncoder().encode(str));
};

// Helper to convert Uint8Array or number[] to string (from vector<u8>)
const uint8ArrayToString = (arr: number[] | Uint8Array): string => {
  return new TextDecoder().decode(Uint8Array.from(arr));
};

// Helper function to parse the raw Move object data into our Agreement type
const parseAgreementObjectResponse = (response: any): Agreement | null => {
  if (!response || !response.data || !response.data.content || response.data.content.type !== `${PACKAGE_ID}::agreements::Agreement`) {
    console.error('Invalid agreement object response:', response);
    return null;
  }

  const fields = response.data.content.fields;
  if (!fields) {
    console.error('No fields in agreement object response:', response);
    return null;
  }

  // The status from Move will be a number (enum discriminant)
  const statusValue = parseInt(fields.status, 10);
  let status: AgreementStatus;
  switch (statusValue) {
    case 0: status = AgreementStatus.DRAFT; break;
    case 1: status = AgreementStatus.PENDING; break;
    case 2: status = AgreementStatus.SIGNED; break;
    case 3: status = AgreementStatus.EXPIRED; break;
    case 4: status = AgreementStatus.REJECTED; break;
    default:
      console.warn(`Unknown agreement status value: ${statusValue}`);
      status = AgreementStatus.DRAFT; // Fallback or handle as error
  }
  
  const signerAreas: SignerArea[] = (fields.signer_areas || []).map((area: any) => ({
    signer: area.fields.signer,
    page: parseInt(area.fields.page, 10),
    x: parseInt(area.fields.x, 10),
    y: parseInt(area.fields.y, 10),
    width: parseInt(area.fields.width, 10),
    height: parseInt(area.fields.height, 10),
    inputType: parseInt(area.fields.input_type, 10),
    value: area.fields.value || [], // Assuming value is vector<u8> which might be empty
    signed: area.fields.signed,
    rejected: area.fields.rejected,
  }));

  return {
    id: fields.id.id, // UID object's ID
    creator: fields.creator,
    title: uint8ArrayToString(fields.title || []),
    description: uint8ArrayToString(fields.description || []),
    fileHash: uint8ArrayToString(fields.file_hash || []), // Or keep as hex/byte array if not string
    fileUrl: uint8ArrayToString(fields.file_url || []),
    signer_areas: signerAreas,
    status: status,
    createdAt: parseInt(fields.created_at, 10),
    isPublic: fields.is_public,
    feePaid: fields.fee_paid,
    expiresAt: parseInt(fields.expires_at, 10),
    // fileName: uint8ArrayToString(fields.file_name || []), // If you add file_name back to Move struct
  };
};


export const getAgreements = async (client: SuiClient, userAddress?: string): Promise<Agreement[]> => {
  try {
    // Fetch all shared objects of type Agreement
    // This is a simplified approach. For production, you'd likely use a more robust indexing solution
    // or query based on specific criteria if possible (e.g., events, dynamic fields).
    
    // The getOwnedObjects approach is more suitable if agreements are owned by users.
    // Since they are shared, we need a different strategy.
    // One common way is to query for objects of a specific type.
    // However, client.getObjectsOwnedByAddress is not for shared objects.
    // We might need to rely on an indexer or a more complex query if client.getDynamicFields isn't suitable.

    // For now, let's assume we have a way to get a list of agreement object IDs.
    // This part is highly dependent on how you plan to discover agreement objects.
    // If they are all publicly shared and you know their type, you might use a broader query
    // or an indexer.
    // A common pattern for shared objects is to query events to find their IDs.

    // Placeholder: In a real app, you'd get these IDs from an indexer or by querying events.
    // For demonstration, if you knew some object IDs, you could fetch them directly.
    // const knownObjectIds = ["0x...", "0x..."]; 
    // if (knownObjectIds.length === 0) return [];
    // const objectInfos = await client.multiGetObjects({ ids: knownObjectIds, options: { showContent: true } });

    // Due to the limitations of directly querying all shared objects of a type without an indexer,
    // this function will be more illustrative.
    // A more practical approach for fetching "all" agreements or agreements relevant to a user
    // often involves an off-chain indexer that listens to creation events.

    // Let's simulate fetching objects if we had their IDs.
    // This function would need to be adapted based on your indexing/discovery strategy.
    console.warn("getAgreements: This function needs a proper way to discover shared agreement object IDs (e.g., via an indexer or event querying).");
    
    // Example: If agreements are indexed and you get their IDs
    const exampleAgreementIds: string[] = []; // Populate this from your indexer or event store

    if (exampleAgreementIds.length === 0) {
        return [];
    }

    const agreementObjects = await client.multiGetObjects({
      ids: exampleAgreementIds,
      options: { showContent: true, showType: true, showOwner: true },
    });

    const agreements: Agreement[] = agreementObjects
      .map(parseAgreementObjectResponse)
      .filter((agreement): agreement is Agreement => agreement !== null);
    
    // If userAddress is provided, you might filter further, though shared objects are generally accessible.
    // Filtering might be more about relevance (e.g., is creator or signer).
    if (userAddress) {
      return agreements.filter(
        (ag) => ag.creator === userAddress || ag.signer_areas.some((area) => area.signer === userAddress)
      );
    }
    return agreements;

  } catch (error) {
    console.error('Error fetching agreements:', error);
    return [];
  }
};

export const getAgreementById = async (client: SuiClient, agreementId: string): Promise<Agreement | null> => {
  try {
    const response = await client.getObject({
      id: agreementId,
      options: { showContent: true, showType: true },
    });
    return parseAgreementObjectResponse(response);
  } catch (error) {
    console.error(`Error fetching agreement by ID ${agreementId}:`, error);
    return null;
  }
};

interface CreateDraftAgreementArgs {
  title: string;
  description: string;
  fileHash: string;
  fileUrl: string;
  signerAddresses: string[];
  pages: number[];
  xs: number[];
  ys: number[];
  widths: number[];
  heights: number[];
  inputTypes: number[];
  isPublic: boolean;
  expiresAt: number; // Unix timestamp ms
}

export const createDraftAgreement = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, // Assuming currentAccount is an instance of ZkLoginAccount
  args: CreateDraftAgreementArgs
): Promise<string | null> => { // Returns transaction digest or null
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);

    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::create_draft`,
      arguments: [
        tx.pure.vector('u8', stringToUint8Array(args.title)),
        tx.pure.vector('u8', stringToUint8Array(args.description)),
        tx.pure.vector('u8', stringToUint8Array(args.fileHash)),
        tx.pure.vector('u8', stringToUint8Array(args.fileUrl)),
        tx.pure.vector('address', args.signerAddresses),
        tx.pure.vector('u64', args.pages),
        tx.pure.vector('u64', args.xs),
        tx.pure.vector('u64', args.ys),
        tx.pure.vector('u64', args.widths),
        tx.pure.vector('u64', args.heights),
        tx.pure.vector('u8', args.inputTypes),
        tx.pure.bool(args.isPublic),
        tx.pure.u64(args.expiresAt),
        tx.object.clock(),
      ],
    });

    // Build the transaction block to get the bytes
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);

    // Get the zkLogin signature
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    
    // Execute the transaction
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes, // Send the Uint8Array
      signature: zkLoginSignature,
      options: { showEffects: true, showObjectChanges: true },
    });
    
    console.log('Create draft agreement transaction result:', result);
    if (result.effects?.status.status === 'success') {
        const createdObject = result.effects.created?.find(
            (obj: any) => obj.owner === 'Shared' && obj.objectType?.includes(`${PACKAGE_ID}::agreements::Agreement`)
        );
        if (createdObject) {
            console.log('New agreement created with ID:', createdObject.reference.objectId);
        }
        return result.digest;
    }
    return null;

  } catch (error) {
    console.error('Error creating draft agreement:', error);
    return null;
  }
};

export const sendAgreement = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, 
  agreementId: string
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::send_agreement`,
      arguments: [
        tx.object(agreementId),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Send agreement transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error(`Error sending agreement ${agreementId}:`, error);
    return null;
  }
};

// Helper to find a suitable coin for fee payment
export const getCoinForFee = async (
  client: SuiClient,
  address: string,
  requiredAmount: bigint | number
): Promise<string | undefined> => {
  try {
    // Convert requiredAmount to bigint if it's a number
    const required = typeof requiredAmount === 'number' ? BigInt(requiredAmount) : requiredAmount;
    
    // Get all SUI coins owned by the address
    const { data: coins } = await client.getCoins({
      owner: address,
      coinType: '0x2::sui::SUI',
    });

    if (!coins.length) {
      console.error('No SUI coins found for address:', address);
      return undefined;
    }

    // First try to find a coin that has exactly or slightly more than the required amount
    // This avoids unnecessary splits
    for (const coin of coins) {
      const balance = BigInt(coin.balance);
      if (balance >= required && balance <= required + BigInt(10000000)) { // Within 0.01 SUI
        return coin.coinObjectId;
      }
    }

    // Then try to find any coin with sufficient balance
    for (const coin of coins) {
      if (BigInt(coin.balance) >= required) {
        return coin.coinObjectId;
      }
    }

    // If no single coin has enough balance, we'll need to merge coins
    // This is more complex and requires a separate transaction
    // For simplicity, just report insufficient balance here
    console.error('No single coin with sufficient balance found. Total required:', required.toString());
    return undefined;
  } catch (error) {
    console.error('Error finding coin for fee:', error);
    return undefined;
  }
};

export const payFee = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, 
  agreementId: string,
  feeCoinObjectId?: string // Make this parameter optional 
): Promise<string | null> => {
  try {
    // First fetch the treasury details to get the required fee amount
    const treasuryDetails = await getTreasuryDetails(client);
    if (!treasuryDetails) {
      console.error('Failed to fetch treasury details');
      return null;
    }
    
    const feeAmount = BigInt(treasuryDetails.fee);
    console.log(`Fee required: ${feeAmount.toString()} MIST`);
    
    // If no specific coin ID was provided, try to find an appropriate coin
    if (!feeCoinObjectId) {
      feeCoinObjectId = await getCoinForFee(client, currentAccount.address, feeAmount);
      if (!feeCoinObjectId) {
        console.error('Could not find a suitable coin for fee payment');
        return null;
      }
    }
    
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    
    // Get the coin details to check its balance
    const coinResponse = await client.getObject({
      id: feeCoinObjectId,
      options: { showContent: true }
    });
    
    // Parse the coin balance - the exact path will depend on the API response structure
    let coinBalance: bigint;
    try {
      // Safely navigate to balance, handling different possible response structures
      const content = coinResponse.data?.content;
      if (content && 'dataType' in content && content.dataType === 'moveObject') {
        // Access fields based on SDK's actual response structure
        const balanceStr = content.fields?.balance;
        if (balanceStr) {
          coinBalance = BigInt(balanceStr);
        } else {
          throw new Error('Balance field not found in coin object');
        }
      } else {
        throw new Error('Invalid coin content structure');
      }
    } catch (error) {
      console.error('Error parsing coin balance:', error);
      return null;
    }
    
    let coinArg;
    // If coin has more than needed, split it
    if (coinBalance > feeAmount) {
      console.log('Splitting coin to exact fee amount');
      // Use tx.pure.u64 instead of the two-parameter form
      const [feeCoin] = tx.splitCoins(tx.object(feeCoinObjectId), [tx.pure.u64(feeAmount)]);
      coinArg = feeCoin; // Use the split coin
    } else {
      // Use the coin directly
      coinArg = tx.object(feeCoinObjectId);
    }
    
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::pay_fee`,
      arguments: [
        tx.object(agreementId),
        tx.object(TREASURY_ID),
        coinArg, // Use the appropriate coin argument
        tx.object(CLOCK_ID),
      ],
    });
    
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true, showBalanceChanges: true },
    });
    
    console.log('Pay fee transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error(`Error paying fee for agreement ${agreementId}:`, error);
    return null;
  }
};

export const signArea = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, 
  agreementId: string,
  areaIndex: number,
  signatureHash: number[] 
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::sign_area`,
      arguments: [
        tx.object(agreementId),
        tx.pure.u64(areaIndex),
        tx.pure.vector('u8', signatureHash),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Sign area transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error(`Error signing area ${areaIndex} for agreement ${agreementId}:`, error);
    return null;
  }
};

export const rejectAgreement = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, 
  agreementId: string,
  areaIndex: number
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::reject_agreement`,
      arguments: [
        tx.object(agreementId),
        tx.pure.u64(areaIndex),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Reject agreement transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error(`Error rejecting agreement ${agreementId} for area ${areaIndex}:`, error);
    return null;
  }
};

export const expireAgreement = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, 
  agreementId: string
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::expire_agreement`,
      arguments: [
        tx.object(agreementId),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Expire agreement transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error(`Error expiring agreement ${agreementId}:`, error);
    return null;
  }
};

// Admin functions
export const withdrawFromTreasury = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, // Admin account
  amount: number 
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::withdraw`,
      arguments: [
        tx.object(TREASURY_ID),
        tx.pure.u64(amount),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Withdraw from treasury transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error('Error withdrawing from treasury:', error);
    return null;
  }
};

export const updateFee = async (
  client: SuiClient,
  currentAccount: ZkLoginAccount, // Admin account
  newFee: number 
): Promise<string | null> => {
  try {
    const tx = new Transaction();
    tx.setSender(currentAccount.address);
    tx.moveCall({
      target: `${PACKAGE_ID}::agreements::update_fee`,
      arguments: [
        tx.object(TREASURY_ID),
        tx.pure.u64(newFee),
        tx.object.clock(),
      ],
    });
    const txBytes = await tx.build({ client });
    const txBytesBase64 = toB64(txBytes);
    const zkLoginSignature = await currentAccount.getZkLoginSignature(txBytesBase64);
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: zkLoginSignature,
      options: { showEffects: true },
    });
    console.log('Update fee transaction result:', result);
    return result.digest;
  } catch (error) {
    console.error('Error updating fee:', error);
    return null;
  }
};

// You might also want a function to fetch Treasury details
export const getTreasuryDetails = async (client: SuiClient) => {
  try {
    const response = await client.getObject({
      id: TREASURY_ID,
      options: { showContent: true, showOwner: true, showType: true }, // Ensure showContent is true
    });
    
    if (response && response.data && response.data.content && response.data.content.dataType === 'moveObject') {
      return response.data.content.fields as { id: { id: string }, admin: string, fee: string, balance: { value: string, type: string } }; // Adjust types as per actual Treasury struct fields
    }
    console.warn('Treasury object content not found or not a Move object:', response);
    return null;
  } catch (error) {
    console.error('Error fetching treasury details:', error);
    return null;
  }
};
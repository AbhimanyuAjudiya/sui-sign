// sponsorService.ts - Handles sponsored transactions for users without gas
import { TransactionBlock } from '@mysten/sui/transactions';
import { suiClient } from '../utils/suiClient';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';

// This would come from secure environment variables in production
const SPONSOR_PRIVATE_KEY = process.env.VITE_SPONSOR_PRIVATE_KEY || 
  '0x1111111111111111111111111111111111111111111111111111111111111111'; // Replace with your actual sponsor key

// Create a keypair from the private key
const getSponsorKeypair = () => {
  try {
    return Ed25519Keypair.fromSecretKey(
      Uint8Array.from(Buffer.from(SPONSOR_PRIVATE_KEY.replace('0x', ''), 'hex'))
    );
  } catch (error) {
    // console.error('Failed to create sponsor keypair:', error);
    throw new Error('Sponsor configuration error');
  }
};

/**
 * Sponsors a transaction by paying for gas on behalf of a user
 * 
 * @param txBlock The transaction block prepared by the user
 * @param userSignature The signature from the user
 * @returns The transaction digest
 */
export async function sponsorTransaction(
  txBlock: TransactionBlock,
  userAddress: string,
  userSignature: Uint8Array
): Promise<string> {
  try {
    const sponsorKeypair = getSponsorKeypair();
    const sponsorAddress = sponsorKeypair.toSuiAddress();
    
    // console.log('Sponsoring transaction for user', userAddress);
    // console.log('Sponsor address:', sponsorAddress);

    // Build the transaction with gas from the sponsor
    const builtTx = await suiClient.prepareTransactionBlock({
      transactionBlock: txBlock,
      gasOwner: sponsorAddress, // The sponsor pays for gas
    });

    // Combine signatures (user's signature + sponsor's signature)
    const sponsorSignature = await sponsorKeypair.signTransactionBlock(builtTx);
    
    // Execute the transaction with both signatures
    const result = await suiClient.executeTransactionBlock({
      transactionBlock: builtTx.bytes,
      signatures: [userSignature, sponsorSignature.signature],
      options: { showEffects: true },
    });

    // console.log('Sponsored transaction executed successfully:', result.digest);
    return result.digest;
  } catch (error) {
    // console.error('Failed to sponsor transaction:', error);
    throw new Error(`Sponsorship failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a sponsored transaction builder for any Move call
 * This is a simplified version to help with common operations
 * 
 * @param packageId The Move package ID
 * @param module The Move module name
 * @param function The Move function name
 * @param typeArgs Type arguments (if any)
 * @param args Arguments to pass to the function
 * @returns A function that executes the sponsored transaction
 */
export function createSponsoredMoveCall(
  packageId: string,
  module: string,
  func: string,
  typeArgs: string[] = [],
  ...args: any[]
) {
  return async (userAddress: string, userKeypair: Ed25519Keypair): Promise<string> => {
    // Create a new transaction block
    const txb = new TransactionBlock();
    
    // Add the Move call
    txb.moveCall({
      target: `${packageId}::${module}::${func}`,
      typeArguments: typeArgs,
      arguments: args.map(arg => txb.pure(arg))
    });
    
    // Use the user's address as the sender
    txb.setSender(userAddress);
    
    // Have the user sign the transaction
    const builtTx = await suiClient.prepareTransactionBlock({
      transactionBlock: txb,
    });
    
    const userSignature = await userKeypair.signTransactionBlock(builtTx);
    
    // Sponsor the transaction
    return sponsorTransaction(txb, userAddress, userSignature.signature);
  };
}

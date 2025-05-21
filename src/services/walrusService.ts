import { suiClient } from '../utils/suiClient';

// Improved mock version of WalrusClient that works without the actual WASM dependency
// This simulates the Walrus SDK for document storage in our demo app
class MockWalrusClient {
  private blobStorage = new Map<string, Uint8Array>();
  private network: string;
  
  constructor(options: { network: string }) {
    this.network = options.network;
    // console.log(`Initialized Mock Walrus Client on ${this.network}`);
    
    // Load any existing data from localStorage for persistence across refreshes
    this.loadFromLocalStorage();
  }
  
  // Load stored blobs from localStorage
  private loadFromLocalStorage() {
    try {
      const storedKeys = localStorage.getItem('walrus-blob-keys');
      if (storedKeys) {
        const keys = JSON.parse(storedKeys) as string[];
        
        keys.forEach(key => {
          const blobData = localStorage.getItem(`walrus-blob-${key}`);
          if (blobData) {
            const data = new Uint8Array(JSON.parse(blobData));
            this.blobStorage.set(key, data);
            // console.log(`[Mock Walrus] Loaded blob ${key} from localStorage (${data.length} bytes)`);
          }
        });
      }
    } catch (err) {
      // console.error('[Mock Walrus] Failed to load from localStorage:', err);
    }
  }
  
  // Save a blob to localStorage
  private saveToLocalStorage(blobId: string, data: Uint8Array) {
    try {
      // Get existing keys
      const storedKeys = localStorage.getItem('walrus-blob-keys');
      const keys = storedKeys ? JSON.parse(storedKeys) as string[] : [];
      
      // Add this key if it's not already there
      if (!keys.includes(blobId)) {
        keys.push(blobId);
        localStorage.setItem('walrus-blob-keys', JSON.stringify(keys));
      }
      
      // Store the actual blob data (as JSON array)
      localStorage.setItem(`walrus-blob-${blobId}`, JSON.stringify(Array.from(data)));
      // console.log(`[Mock Walrus] Saved blob ${blobId} to localStorage (${data.length} bytes)`);
    } catch (err) {
      // console.error('[Mock Walrus] Failed to save to localStorage:', err);
    }
  }
  
  async writeBlob({ blob, signer, epochs, deletable = false }: { 
    blob: Uint8Array; 
    signer: any; 
    epochs: number;
    deletable?: boolean;
  }): Promise<{ blobId: string }> {
    // Generate a blobId that looks like a Walrus ID
    // In real Walrus, this would be a CID (Content Identifier)
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const blobId = `walrus-${Array.from(randomBytes.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    
    // Store the blob
    this.blobStorage.set(blobId, blob);
    
    // Also persist to localStorage for better demo experience
    this.saveToLocalStorage(blobId, blob);
    
    // console.log(`[Mock Walrus] Stored blob ${blobId} (${blob.length} bytes) for ${epochs} epochs`);
    
    // Log other parameters
    // console.log(`[Mock Walrus] Signer address: ${signer?.getAddress?.() || 'unknown'}`);
    // console.log(`[Mock Walrus] Deletable: ${deletable}`);
    
    return { blobId };
  }
  
  async readBlob({ blobId }: { blobId: string }): Promise<Uint8Array> {
    const blob = this.blobStorage.get(blobId);
    
    if (!blob) {
      // For demo purposes, generate a more realistic PDF for non-existent blobs
      // console.log(`[Mock Walrus] Generating mock data for blobId: ${blobId}`);
      
      // Create a simple PDF (this is a very minimal PDF structure)
      const mockPdfData = new Uint8Array([
        // PDF header
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, // %PDF-1.4
        // Some objects and content to make it look like a real PDF
        0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, // 1 0 obj
        0x3C, 0x3C, 0x0A, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x20, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x0A,
        0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x0A,
        0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
        // More PDF content (simplified)
        0x32, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A,
        0x3C, 0x3C, 0x0A, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x20, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x73, 0x0A,
        0x2F, 0x4B, 0x69, 0x64, 0x73, 0x20, 0x5B, 0x33, 0x20, 0x30, 0x20, 0x52, 0x5D, 0x0A,
        0x2F, 0x43, 0x6F, 0x75, 0x6E, 0x74, 0x20, 0x31, 0x0A,
        0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
        // Basic page content
        0x33, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A,
        0x3C, 0x3C, 0x0A, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x20, 0x2F, 0x50, 0x61, 0x67, 0x65, 0x0A,
        0x2F, 0x50, 0x61, 0x72, 0x65, 0x6E, 0x74, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x0A,
        0x2F, 0x43, 0x6F, 0x6E, 0x74, 0x65, 0x6E, 0x74, 0x73, 0x20, 0x34, 0x20, 0x30, 0x20, 0x52, 0x0A,
        0x3E, 0x3E, 0x0A, 0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
        // Add some text content
        0x34, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A,
        0x3C, 0x3C, 0x0A, 0x2F, 0x4C, 0x65, 0x6E, 0x67, 0x74, 0x68, 0x20, 0x34, 0x34, 0x0A,
        0x3E, 0x3E, 0x0A, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A,
        0x42, 0x54, 0x0A, 0x2F, 0x46, 0x31, 0x20, 0x31, 0x32, 0x20, 0x54, 0x66, 0x0A,
        0x31, 0x30, 0x30, 0x20, 0x37, 0x30, 0x30, 0x20, 0x54, 0x64, 0x0A,
        0x28, 0x53, 0x69, 0x67, 0x6E, 0x69, 0x6E, 0x67, 0x20, 0x41, 0x67, 0x72, 0x65, 0x65, 0x6D, 0x65, 0x6E, 0x74, 0x20, 0x44, 0x6F, 0x63, 0x75, 0x6D, 0x65, 0x6E, 0x74, 0x29, 0x20, 0x54, 0x6A, 0x0A,
        0x45, 0x54, 0x0A, 0x65, 0x6E, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A,
        0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,
        // PDF trailer
        0x78, 0x72, 0x65, 0x66, 0x0A,
        0x30, 0x20, 0x35, 0x0A,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x0A,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x30, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x39, 0x38, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x39, 0x31, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x32, 0x39, 0x32, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6E, 0x0A,
        0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A,
        0x3C, 0x3C, 0x0A, 0x2F, 0x53, 0x69, 0x7A, 0x65, 0x20, 0x35, 0x0A,
        0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x0A,
        0x3E, 0x3E, 0x0A,
        0x73, 0x74, 0x61, 0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0A,
        0x34, 0x30, 0x38, 0x0A,
        0x25, 0x25, 0x45, 0x4F, 0x46
      ]);
      
      // Store this mock PDF for future requests
      this.blobStorage.set(blobId, mockPdfData);
      
      // console.log(`[Mock Walrus] Generated mock PDF for ${blobId} (${mockPdfData.length} bytes)`);
      return mockPdfData;
    }
    
    // console.log(`[Mock Walrus] Retrieved blob ${blobId} (${blob.length} bytes)`);
    return blob;
  }
  
  reset(): void {
    // console.log(`[Mock Walrus] Client reset`);
  }
}

// Create a Walrus client instance
// For development, we'll use our mock client to avoid WASM issues
const walrusClient = new MockWalrusClient({
  network: 'testnet'
});

/**
 * Uploads a PDF document to Walrus storage
 * @param file The PDF file as an ArrayBuffer
 * @param signer The signer that will pay for the upload
 * @param epochs The number of epochs to store the file (default: 10)
 * @returns The blob ID of the uploaded file
 */
export const uploadAgreementToWalrus = async (
  file: ArrayBuffer,
  signer: any, // Use 'any' to avoid type issues with the signer
  epochs: number = 10
): Promise<string> => {
  try {
    const fileBytes = new Uint8Array(file);

    // console.log(`Uploading file (${fileBytes.length} bytes) to Walrus...`);
    
    const { blobId } = await walrusClient.writeBlob({
      blob: fileBytes,
      deletable: false, // Agreements shouldn't be deletable for audit trail
      epochs: epochs,
      signer: signer,
    });

    // console.log(`File uploaded successfully to Walrus with blob ID: ${blobId}`);
    return blobId;
  } catch (error) {
    // console.error('Error uploading file to Walrus:', error);
    throw error;
  }
};

/**
 * Downloads a document from Walrus storage
 * @param blobId The blob ID of the document
 * @returns The document as a Uint8Array
 */
export const downloadAgreementFromWalrus = async (blobId: string): Promise<Uint8Array> => {
  try {
    // console.log(`Downloading file with blob ID: ${blobId} from Walrus...`);
    
    // Add validation for the blobId
    if (!blobId || typeof blobId !== 'string') {
      throw new Error(`Invalid blob ID: ${blobId}`);
    }
    
    // Attempt to download the blob
    const blob = await walrusClient.readBlob({ blobId });
    
    // Validate the returned blob
    if (!blob || !(blob instanceof Uint8Array) || blob.length === 0) {
      throw new Error('Invalid or empty blob returned from Walrus');
    }
    
    // console.log(`File downloaded successfully (${blob.length} bytes)`);
    return blob;
  } catch (error) {
    // console.error('Error downloading file from Walrus:', error);
    
    // For demo purposes, generate a mock PDF as a fallback
    // This ensures the UI can still demonstrate functionality
    const message = error instanceof Error ? error.message : 'Unknown error';
    // console.warn(`Generating fallback mock PDF data because: ${message}`);
    
    // Create a simple default PDF as fallback (minimum size PDF)
    return createFallbackPdf(`Error: ${message}`);
  }
};

/**
 * Creates a very basic fallback PDF with an error message
 * This is only used for demonstration purposes when real documents can't be retrieved
 */
function createFallbackPdf(errorMessage: string): Uint8Array {
  // Create a minimal PDF that will actually render in PDF viewers
  // This is a very simple PDF with just the basic structure needed
  const pdfHeader = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A,  // %PDF-1.4
    // Basic PDF structure with an error message
    0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A,  // 1 0 obj
    0x3C, 0x3C, 0x2F, 0x54, 0x79, 0x70, 0x65, 0x2F, 0x43, 0x61, 0x74, 0x61, 0x6C, 0x6F, 0x67, 0x2F, 
    0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 
    0x65, 0x6E, 0x64, 0x6F, 0x62, 0x6A, 0x0A,  // endobj
  ]);
  
  // Add error message as text in the PDF
  const errorText = `Sample document - ${errorMessage}`;
  const textBytes = new TextEncoder().encode(errorText);
  
  // Combine the arrays
  const result = new Uint8Array(pdfHeader.length + textBytes.length + 50);
  result.set(pdfHeader);
  result.set(textBytes, pdfHeader.length);
  
  // Add PDF trailer to make it minimally valid
  const trailer = new Uint8Array([
    0x0A, 0x74, 0x72, 0x61, 0x69, 0x6C, 0x65, 0x72, 0x0A, 
    0x3C, 0x3C, 0x2F, 0x52, 0x6F, 0x6F, 0x74, 0x20, 0x31, 0x20, 0x30, 0x20, 0x52, 0x3E, 0x3E, 0x0A, 
    0x25, 0x25, 0x45, 0x4F, 0x46
  ]);
  
  result.set(trailer, pdfHeader.length + textBytes.length);
  
  return result;
}

/**
 * Resets the Walrus client in case of retryable errors
 */
export const resetWalrusClient = () => {
  walrusClient.reset();
  // console.log('Walrus client has been reset');
};

export { walrusClient };

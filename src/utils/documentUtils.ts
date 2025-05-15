// This is a helper module for document-related utilities
import { uint8ArrayToDataUrl, downloadPdf } from './fileUtils';
import { downloadAgreementFromWalrus } from '../services/walrusService';
import { downloadFromWalrus } from './walrusClient';

export function validateDocumentUrl(url: string): Promise<boolean> {
  // Skip validation for blob URLs (e.g., local PDF uploads) and for PDFs
  if (url.startsWith('blob:') || isPdfUrl(url)) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const img = new Image();
    
    // Handle success
    img.onload = () => {
      console.log('Document URL is valid:', url);
      resolve(true);
    };
    
    // Handle failure
    img.onerror = () => {
      console.error('Failed to load document from URL:', url);
      resolve(false);
    };
    
    // Start loading the image
    img.src = url;
    
    // Set a timeout in case the image loading hangs
    setTimeout(() => {
      if (!img.complete) {
        console.error('Timed out trying to load document:', url);
        resolve(false);
      }
    }, 5000);
  });
}

// Check if the URL is for a PDF document
export function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
}

// Utility to convert PDF pages to images for fabric.js display
export async function convertPdfPageToImageUrl(
  pdfUrl: string, 
  pageNumber: number = 1
): Promise<string | null> {
  try {
    // This is a placeholder for actual PDF-to-image conversion
    // In a real implementation, you'd use PDF.js to render the page to a canvas
    // then convert the canvas to a data URL
    
    console.log('Would convert page', pageNumber, 'of PDF:', pdfUrl);
    
    // For now, just return the original URL
    return pdfUrl;
  } catch (error) {
    console.error('Error converting PDF page to image:', error);
    return null;
  }
}

/**
 * Downloads an agreement document from Walrus
 * @param fileHash The blob ID of the document in Walrus
 * @param fileName Optional filename to use for the download
 */
export const downloadDocument = async (fileHash: string, fileName: string = 'agreement.pdf'): Promise<void> => {
  try {
    console.log(`Downloading document with hash: ${fileHash}`);
    
    if (!fileHash) {
      throw new Error('Invalid file hash provided');
    }
    
    // Try using the Walrus SDK client first
    try {
      const documentBytes = await downloadFromWalrus(fileHash);
      if (documentBytes && documentBytes.length > 0) {
        console.log(`Document downloaded successfully from Walrus SDK (${documentBytes.length} bytes)`);
        downloadPdf(documentBytes, fileName);
        return;
      }
    } catch (walrusError) {
      console.warn('Error using Walrus SDK client, falling back to legacy method:', walrusError);
    }
    
    // Fallback to the legacy method
    const documentBytes = await downloadAgreementFromWalrus(fileHash);
    
    if (!documentBytes || documentBytes.length === 0) {
      throw new Error('Empty document received from Walrus');
    }
    
    // Check that it at least starts with the PDF signature (%PDF)
    if (documentBytes.length >= 4 &&
        documentBytes[0] === 0x25 && // %
        documentBytes[1] === 0x50 && // P
        documentBytes[2] === 0x44 && // D
        documentBytes[3] === 0x46) { // F
      console.log('Valid PDF document detected, downloading...');
    } else {
      console.warn('Document does not appear to be a valid PDF, but attempting download anyway');
    }
    
    downloadPdf(documentBytes, fileName);
    console.log('Document downloaded successfully');
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

/**
 * Gets a data URL for an agreement document from Walrus
 * @param fileHash The blob ID of the document in Walrus
 * @returns A data URL for the document
 */
export const getDocumentDataUrl = async (fileHash: string): Promise<string> => {
  try {
    console.log(`Getting data URL for document with hash: ${fileHash}`);
    
    if (!fileHash) {
      throw new Error('Invalid file hash provided');
    }
    
    // Try using the Walrus SDK client first
    try {
      const documentBytes = await downloadFromWalrus(fileHash);
      if (documentBytes && documentBytes.length > 0) {
        console.log(`Document downloaded successfully from Walrus SDK (${documentBytes.length} bytes)`);
        return uint8ArrayToDataUrl(documentBytes);
      }
    } catch (walrusError) {
      console.warn('Error using Walrus SDK client, falling back to legacy method:', walrusError);
    }
    
    // Fallback to the legacy method
    const documentBytes = await downloadAgreementFromWalrus(fileHash);
    
    if (!documentBytes || documentBytes.length === 0) {
      throw new Error('Empty document received from Walrus');
    }
    
    return uint8ArrayToDataUrl(documentBytes);
  } catch (error) {
    console.error('Error getting document data URL:', error);
    throw error;
  }
};

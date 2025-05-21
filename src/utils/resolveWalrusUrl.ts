// Utility functions to resolve Walrus blob IDs to document data URLs

import { getDocumentDataUrl } from './documentUtils';

/**
 * Checks if a URL is a Walrus blob ID
 * @param url The URL or blob ID to check
 * @returns True if the URL is a Walrus blob ID
 */
export const isWalrusBlob = (url?: string): boolean => {
  if (!url) return false;
  return url.startsWith('walrus-');
};

/**
 * Creates a URL for a document from a Walrus blob ID or returns the original URL if it's not a Walrus blob ID
 * This handles both direct URLs and Walrus blob IDs
 * @param urlOrBlobId The URL or blob ID to resolve
 * @returns A Promise that resolves to the data URL for the document
 */
export const resolveDocumentUrl = async (urlOrBlobId?: string): Promise<string> => {
  if (!urlOrBlobId) {
    throw new Error('No document URL or blob ID provided');
  }
  
  // If this is a Walrus blob ID, convert it to a data URL
  if (isWalrusBlob(urlOrBlobId)) {
    try {
      // console.log(`Resolving Walrus blob ID: ${urlOrBlobId}`);
      const dataUrl = await getDocumentDataUrl(urlOrBlobId);
      // console.log(`Successfully resolved Walrus blob ID to data URL`);
      return dataUrl;
    } catch (error) {
      // // console.error(`Failed to resolve Walrus blob ID ${urlOrBlobId}:`, error);
      throw new Error(`Failed to load document from Walrus: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // If it's already a URL, just return it
  return urlOrBlobId;
};

/**
 * Creates a document loading function compatible with react-pdf for a URL or Walrus blob ID
 * @param urlOrBlobId The URL or blob ID to load
 * @returns A loading function that resolves to an ArrayBuffer or a direct URL string
 */
export const createDocumentLoader = (urlOrBlobId?: string): string | (() => Promise<string | ArrayBuffer>) => {
  if (!urlOrBlobId) {
    throw new Error('No document URL or blob ID provided');
  }
  
  // If this is a Walrus blob ID, we need to create a custom loader function
  if (isWalrusBlob(urlOrBlobId)) {
    return async () => {
      try {
        // // console.log(`Creating document loader for Walrus blob ID: ${urlOrBlobId}`);
        const dataUrl = await getDocumentDataUrl(urlOrBlobId);
        // // console.log(`Successfully created document loader for Walrus blob ID`);
        // Convert data URL to ArrayBuffer if needed
        if (dataUrl.startsWith('data:')) {
          try {
            const response = await fetch(dataUrl);
            return await response.arrayBuffer();
          } catch (fetchError) {
            // // console.warn('Failed to convert data URL to ArrayBuffer, using data URL directly:', fetchError);
            return dataUrl;
          }
        }
        return dataUrl;
      } catch (error) {
        // console.error(`Failed to load document from Walrus blob ID ${urlOrBlobId}:`, error);
        throw new Error(`Failed to load document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
  }
  
  // If it's already a URL, just return it
  return urlOrBlobId;
};

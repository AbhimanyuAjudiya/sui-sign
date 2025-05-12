// This is a helper module for document-related utilities
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

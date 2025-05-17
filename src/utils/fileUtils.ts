/**
 * Converts a file object to an ArrayBuffer
 * @param file The File object to convert
 * @returns Promise resolving to an ArrayBuffer
 */
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Converts a Blob URL to an ArrayBuffer
 * @param blobUrl The Blob URL to convert
 * @returns Promise resolving to an ArrayBuffer
 */
export const blobUrlToArrayBuffer = async (blobUrl: string): Promise<ArrayBuffer> => {
  const response = await fetch(blobUrl);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert Blob URL to ArrayBuffer'));
      }
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsArrayBuffer(blob);
  });
};

/**
 * Creates a download link for a Uint8Array as a PDF
 * @param data The Uint8Array containing PDF data
 * @param filename The filename to use for the download
 */
export const downloadPdf = (data: Uint8Array, filename: string) => {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Creates a data URL from a Uint8Array
 * @param data The Uint8Array containing file data
 * @param mimeType The MIME type of the file
 * @returns A data URL string
 */
export const uint8ArrayToDataUrl = (data: Uint8Array, mimeType: string = 'application/pdf'): string => {
  try {
    // Check if the input data is too large
    if (data.length > 10 * 1024 * 1024) { // 10MB limit for safety
      console.warn('Data is too large for data URL, truncating');
      data = data.slice(0, 10 * 1024 * 1024);
    }
    
    // Use a more efficient approach with array buffers for large data
    const chunkSize = 0x8000; // 32KB chunks
    let binary = '';
    const len = data.length;
    
    // Process the array in chunks to avoid call stack size exceeded
    for (let i = 0; i < len; i += chunkSize) {
      const slice = data.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    
    // Use btoa for base64 encoding
    return `data:${mimeType};base64,${btoa(binary)}`;
  } catch (error) {
    console.error('Error converting Uint8Array to data URL:', error);
    
    // Fallback to a simpler method if the above fails
    try {
      const blob = new Blob([data], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      return blobUrl;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      return ''; // Return empty string as a last resort
    }
  }
};

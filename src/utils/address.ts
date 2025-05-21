/**
 * Utility functions for handling Sui addresses
 */

/**
 * Truncates a Sui address for display
 * @param address The full Sui address
 * @param startChars Number of characters to show at the start
 * @param endChars Number of characters to show at the end
 * @returns Truncated address with ellipsis
 */
export const truncateAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.substring(0, startChars)}...${address.substring(
    address.length - endChars
  )}`;
};

/**
 * Copies text to clipboard
 * @param text Text to copy
 * @returns Promise that resolves when copying is done
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // console'.error('Failed to copy text: ', error);
    return false;
  }
};

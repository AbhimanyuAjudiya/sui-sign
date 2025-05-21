/**
 * Simple debugging utility to help diagnose session persistence issues
 * without using console.log (which we want to avoid)
 */

// Create a debugging container element attached to the DOM
export function setupDebugger() {
  // Only set up in development mode
  // if (import.meta.env.DEV) {
  //   try {
      // const existingDebugger = document.getElementById('sui-debug-container');
      // if (!existingDebugger) {
        // const debugContainer = document.createElement('div');
    //     debugContainer.id = 'sui-debug-container';
    //     debugContainer.style.position = 'fixed';
    //     debugContainer.style.bottom = '0';
    //     debugContainer.style.right = '0';
    //     debugContainer.style.width = '400px';
    //     debugContainer.style.maxHeight = '200px';
    //     debugContainer.style.overflow = 'auto';
    //     debugContainer.style.background = 'rgba(0,0,0,0.7)';
    //     debugContainer.style.color = 'white';
    //     debugContainer.style.fontSize = '10px';
    //     debugContainer.style.padding = '10px';
    //     debugContainer.style.zIndex = '9999';
    //     debugContainer.style.display = 'none'; // Hidden by default
        
    //     // Add toggle button
    //     const toggleButton = document.createElement('button');
    //     toggleButton.textContent = 'Debug';
    //     toggleButton.style.position = 'fixed';
    //     toggleButton.style.bottom = '0';
    //     toggleButton.style.right = '0';
    //     toggleButton.style.zIndex = '10000';
    //     toggleButton.style.padding = '5px';
    //     toggleButton.style.background = '#333';
    //     toggleButton.style.color = 'white';
    //     toggleButton.style.fontSize = '10px';
    //     toggleButton.style.border = 'none';
    //     toggleButton.style.borderRadius = '3px';
        
    //     toggleButton.addEventListener('click', () => {
    //       if (debugContainer.style.display === 'none') {
    //         debugContainer.style.display = 'block';
    //       } else {
    //         debugContainer.style.display = 'none';
    //       }
    //     });
        
    //     // Wait for DOM to be ready
    //     if (document.body) {
    //       document.body.appendChild(debugContainer);
    //       document.body.appendChild(toggleButton);
    //     } else {
    //       window.addEventListener('DOMContentLoaded', () => {
    //         document.body.appendChild(debugContainer);
    //         document.body.appendChild(toggleButton);
    //       });
    //     }
        
    //     // Log initial storage state
    //     setTimeout(() => {
    //       debugStorage();
    //     }, 1000);
    //   }
    // } catch (e) {
    //   // Silently fail if there's an error setting up the debugger
    //   // console.error("Error setting up debugger UI:", e);
    // }
  // }
}

// Log a message to our custom debugger
export function debugLog(message: string, data?: Record<string, unknown>): void {
  // Only log in development mode
  if (import.meta.env.DEV) {
    const debugContainer = document.getElementById('sui-debug-container');
    if (debugContainer) {
      const logEntry = document.createElement('div');
      logEntry.style.borderBottom = '1px solid #555';
      logEntry.style.paddingBottom = '3px';
      logEntry.style.marginBottom = '3px';
      
      const timestamp = new Date().toLocaleTimeString();
      const dataString = data ? `: ${JSON.stringify(data)}` : '';
      logEntry.textContent = `[${timestamp}] ${message}${dataString}`;
      
      debugContainer.appendChild(logEntry);
      debugContainer.scrollTop = debugContainer.scrollHeight;
    }
  }
}

// Check storage and log its state
export function debugStorage(): Record<string, unknown> {
  // Create an object to store the state
  const storageInfo: Record<string, unknown> = {};
  
  // Only continue in development mode
  if (import.meta.env.DEV) {
    try {
      // Check user data
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          storageInfo.user = JSON.parse(userData);
        } catch {
          storageInfo.user = 'Invalid JSON';
        }
      } else {
        storageInfo.user = null;
      }
      
      // Check JWT (truncate for security)
      const jwt = localStorage.getItem('zklogin-jwt');
      if (jwt) {
        storageInfo.jwt = jwt.substring(0, 20) + '...';
      } else {
        storageInfo.jwt = null;
      }
      
      // Check salt
      storageInfo.salt = localStorage.getItem('zklogin-user-salt');
      
      // Check if proof exists
      const proof = localStorage.getItem('zklogin-proof');
      storageInfo.proof = proof ? 'Present' : 'Missing';
      
      // Check if ephemeral seed exists
      storageInfo.ephemeralSeed = localStorage.getItem('ephemeralSeed') ? 'Present' : 'Missing';
      
      // Check randomness
      storageInfo.randomness = localStorage.getItem('zklogin-randomness');
      
      // Log to console and custom debugger
      // console.log('🔑 Auth Storage State:', storageInfo);
      debugLog('LocalStorage State', storageInfo);
    } catch (error) {
      // console.error('Error in debugStorage:', error);
      debugLog('Error in debugStorage', { error: String(error) });
    }
  }
  
  return storageInfo;
}

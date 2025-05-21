/**
 * Utility for monitoring session events related to localStorage
 * This helps detect when session data might be lost or modified
 */

// Import our debugger utility
import { debugLog, debugStorage } from './debug';

/**
 * A simple event emitter for storage-related events
 */
class SessionEventEmitter {
  private listeners: Array<(event: StorageEvent) => void> = [];

  /**
   * Subscribe to storage events
   */
  subscribe(callback: (event: StorageEvent) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Notify all listeners of an event
   */
  notify(event: StorageEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        // console.error('Error in storage event listener:', error);
      }
    });
  }
}

// Create a global instance
const sessionEvents = new SessionEventEmitter();

/**
 * Monitor localStorage changes related to authentication
 */
export function setupSessionMonitoring(): () => void {
  // The keys we care about for authentication
  const authKeys = [
    'user',
    'zklogin-jwt',
    'zklogin-user-salt',
    'zklogin-proof',
    'ephemeralSeed'
  ];
  
  // Handler for storage changes
  const handleStorageChange = (event: StorageEvent) => {
    // Only process relevant keys
    if (event.key && authKeys.includes(event.key)) {
      debugLog(`Storage change detected for key: ${event.key}`, {
        oldValue: event.oldValue ? 'present' : 'absent',
        newValue: event.newValue ? 'present' : 'absent',
      });
      
      // If a key was removed, this might indicate session problems
      if (event.oldValue && !event.newValue) {
        debugLog(`WARNING: Authentication data removed: ${event.key}`);
        debugStorage();
      }
      
      // Notify subscribers
      sessionEvents.notify(event);
    }
  };
  
  // Add event listener
  window.addEventListener('storage', handleStorageChange);
  
  // Log initial state
  debugStorage();
  
  // Return cleanup function
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}

/**
 * Subscribe to authentication-related storage changes
 */
export function onSessionChange(
  callback: (event: StorageEvent) => void
): () => void {
  return sessionEvents.subscribe(callback);
}

/**
 * Check if all critical session data is present
 */
export function validateSessionStorage(): boolean {
  const hasJwt = !!localStorage.getItem('zklogin-jwt');
  const hasSalt = !!localStorage.getItem('zklogin-user-salt');
  const hasEphemeralSeed = !!localStorage.getItem('ephemeralSeed');
  const hasUser = !!localStorage.getItem('user');
  
  return hasJwt && hasSalt && hasEphemeralSeed && hasUser;
}

/**
 * Attempt to refresh the session's internal activity timestamp
 * This can help prevent the browser from garbage collecting the session
 */
export function touchSession(): void {
  try {
    // Read and immediately write back the user data
    // This refreshes the session's activity timestamp
    const userData = localStorage.getItem('user');
    if (userData) {
      localStorage.setItem('user', userData);
    }
    
    // Do the same for JWT as it's the most critical
    const jwt = localStorage.getItem('zklogin-jwt');
    if (jwt) {
      localStorage.setItem('zklogin-jwt', jwt);
    }
  } catch (error) {
    // console.error('Error touching session:', error);
  }
}

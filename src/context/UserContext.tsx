import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ZkLoginAccount, verifyAuthStorageIntegrity } from '../utils/zkLogin';
import { setupDebugger, debugStorage } from '../utils/debug';
import { onSessionChange, validateSessionStorage } from '../utils/sessionMonitor';

// Enhanced UserContextType with zkLogin functionality
type UserContextType = {
  // User data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // zkLogin state
  zkLoginAccount: ZkLoginAccount | null;
  setZkLoginAccount: (account: ZkLoginAccount | null) => void;
  ephemeralKeyPair: Ed25519Keypair | null;
  setEphemeralKeyPair: (keyPair: Ed25519Keypair | null) => void;
  userSalt: string | null;
  setUserSalt: (salt: string | null) => void;
  jwt: string | null;
  setJwt: (jwt: string | null) => void;
  randomness: string | null;
  setRandomness: (randomness: string | null) => void;
  
  // Auth actions
  login: () => Promise<void>;
  logout: () => void;
};

const UserContext = createContext<UserContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  zkLoginAccount: null,
  setZkLoginAccount: () => {},
  ephemeralKeyPair: null,
  setEphemeralKeyPair: () => {},
  userSalt: null,
  setUserSalt: () => {},
  jwt: null,
  setJwt: () => {},
  randomness: null,
  setRandomness: () => {},
  
  login: async () => {},
  logout: () => {},
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // Set up debugger
  useEffect(() => {
    setupDebugger();
    debugStorage();
  }, []);
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // zkLogin state
  const [zkLoginAccount, setZkLoginAccount] = useState<ZkLoginAccount | null>(null);
  const [ephemeralKeyPair, setEphemeralKeyPair] = useState<Ed25519Keypair | null>(null);
  const [userSalt, setUserSaltState] = useState<string | null>(localStorage.getItem('zklogin-user-salt'));
  const [jwt, setJwtState] = useState<string | null>(localStorage.getItem('zklogin-jwt'));
  const [randomness, setRandomness] = useState<string | null>(localStorage.getItem('zklogin-randomness'));

  // Set user salt with localStorage persistence
  const setUserSalt = (salt: string | null) => {
    if (salt) {
      localStorage.setItem('zklogin-user-salt', salt);
    } else {
      localStorage.removeItem('zklogin-user-salt');
    }
    setUserSaltState(salt);
  };

  // Set JWT with localStorage persistence
  const setJwt = (newJwt: string | null) => {
    if (newJwt) {
      localStorage.setItem('zklogin-jwt', newJwt);
    } else {
      localStorage.removeItem('zklogin-jwt');
    }
    setJwtState(newJwt);
  };

  // Wrap logout in useCallback to avoid unnecessary re-renders
  const logout = useCallback(() => {
    // Clear zkLogin state
    localStorage.removeItem('zklogin-jwt');
    localStorage.removeItem('zklogin-proof');
    localStorage.removeItem('zklogin-randomness');
    localStorage.removeItem('ephemeralSeed');
    // IMPORTANT: DO NOT remove salt to ensure consistent address across sessions
    // localStorage.removeItem('zklogin-user-salt');
    
    // Clear user state but keep the salt
    setZkLoginAccount(null);
    setEphemeralKeyPair(null);
    setJwt(null);
    setRandomness(null);
    setUser(null);
    localStorage.removeItem('user');
    
    debugStorage();
  }, []);
  
  // Login method is implemented in the ZkLoginButton component
  const login = useCallback(async () => {
    // This is just a placeholder - the actual login flow is triggered by ZkLoginButton
    setIsLoading(true);
    try {
      // Login logic happens in the button component
    } catch {
      // Handle login errors
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Update user when zkLoginAccount changes
  useEffect(() => {
    if (zkLoginAccount) {
      const newUser: User = {
        address: zkLoginAccount.address,
        name: 'Sui User', // In a real app, this would come from the JWT claims
        isAuthenticated: true,
      };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Store zkLoginAccount proof if it exists
      if (zkLoginAccount.zkProof) {
        localStorage.setItem('zklogin-proof', JSON.stringify(zkLoginAccount.zkProof));
      }
    } else {
      setUser(null);
      localStorage.removeItem('user');
      // Don't remove the zkProof on regular state changes
    }
  }, [zkLoginAccount]);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      debugStorage();
      
      try {
        // First, verify the integrity of our localStorage auth data
        // This ensures all auth-related data is consistent
        const isValid = verifyAuthStorageIntegrity();
        
        if (!isValid) {
          // If integrity check fails, clear user state but preserve
          // existing localStorage values for debugging
          setUser(null);
          setZkLoginAccount(null);
          setEphemeralKeyPair(null);
          setJwt(null);
          setIsLoading(false);
          return;
        }
        
        // Attempt to restore ZkLoginAccount from localStorage using the static method
        const restoredAccount = ZkLoginAccount.fromStorage();
        
        if (restoredAccount) {
          // If account was successfully restored, update the context
          setZkLoginAccount(restoredAccount);
          setEphemeralKeyPair(restoredAccount.ephemeralKeyPair);
          setJwt(restoredAccount.jwt);
          setUserSalt(restoredAccount.salt);
          
          // Ensure user is set
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          } else {
            // If we have a restored account but no user object, create one
            const newUser = {
              address: restoredAccount.address,
              name: 'Sui User',
              isAuthenticated: true,
            };
            setUser(newUser);
            localStorage.setItem('user', JSON.stringify(newUser));
          }
          
          debugStorage();
        } else {
          // Clear any partial session data
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            // We have user data but couldn't restore the account
            // This is an inconsistent state, so clear the user data
            localStorage.removeItem('user');
            setUser(null);
          }
        }
      } catch {
        // Just log the error silently, don't clear storage
      }
      
      setIsLoading(false);
    };
    
    checkExistingSession();
  }, []);
  
  // Listen for storage changes that might affect authentication
  useEffect(() => {
    // Set up listener for storage events, which helps detect if localStorage
    // is modified by another tab or window
    const unsubscribe = onSessionChange((event) => {
      if (!user?.isAuthenticated) return; // Only handle when authenticated
      
      const isAuthKey = [
        'user', 
        'zklogin-jwt', 
        'ephemeralSeed',
        'zklogin-user-salt'
      ].includes(event.key || '');
      
      // If a critical auth key was removed, validate the entire session
      if (isAuthKey && !event.newValue) {
        if (!validateSessionStorage()) {
          // Session is broken, log out
          console.warn('Session data was modified or removed unexpectedly, logging out');
          logout();
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [user, logout]);
  
  // Periodically check the integrity of the authentication state
  useEffect(() => {
    let interval: number | undefined;
    
    if (user?.isAuthenticated) {
      // If we think we're authenticated, check every 30 seconds that we still have valid credentials
      interval = window.setInterval(() => {
        const hasValidCreds = 
          localStorage.getItem('user') !== null &&
          localStorage.getItem('zklogin-jwt') !== null && 
          localStorage.getItem('ephemeralSeed') !== null;
        
        if (!hasValidCreds) {
          // If credentials are missing but we think we're authenticated,
          // something is wrong with our state, so log out
          logout();
        }
      }, 30000);
    }
    
    return () => {
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [user, logout]);

  return (
    <UserContext.Provider 
      value={{
        // User data
        user,
        isAuthenticated: !!user?.isAuthenticated,
        isLoading,
        
        // zkLogin state
        zkLoginAccount,
        setZkLoginAccount,
        ephemeralKeyPair,
        setEphemeralKeyPair,
        userSalt,
        setUserSalt,
        jwt,
        setJwt,
        randomness,
        setRandomness,
        
        // Auth actions
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

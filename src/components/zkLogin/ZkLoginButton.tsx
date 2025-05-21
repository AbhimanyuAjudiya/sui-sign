import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateRandomness, generateNonce } from '@mysten/sui/zklogin';
import { useUser } from '../../context/UserContext';
import Button from '../ui/Button';
import { debugStorage } from '../../utils/debug';

// Get environment variables
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Default to the current origin if REDIRECT_URI is not set
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/callback`;

interface ZkLoginButtonProps {
  onLogin?: () => void;
  isLoading?: boolean;
}

const ZkLoginButton = ({ onLogin, isLoading = false }: ZkLoginButtonProps) => {
  const navigate = useNavigate();
  const { setEphemeralKeyPair, setRandomness, isAuthenticated } = useUser();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = useCallback(async () => {
    try {
      // Clear all previous login state except salt
      localStorage.removeItem('ephemeralSeed');
      localStorage.removeItem('zklogin-randomness');
      localStorage.removeItem('zklogin-jwt');
      localStorage.removeItem('zklogin-proof');
      localStorage.removeItem('user');
      debugStorage();
      
      // Create a proper random seed
      const seed = new Uint8Array(32);
      window.crypto.getRandomValues(seed);
      
      // Create a keypair from this seed
      const seedKeyPair = Ed25519Keypair.fromSecretKey(seed);
      setEphemeralKeyPair(seedKeyPair);
      
      // Store the raw bytes of the seed for later retrieval
      // Using localStorage instead of sessionStorage for better persistence
      localStorage.setItem('ephemeralSeed', JSON.stringify(Array.from(seed)));
      
      // Generate randomness for nonce
      const newRandomness = generateRandomness();
      setRandomness(newRandomness);
      localStorage.setItem('zklogin-randomness', newRandomness);
      
      // Verify everything was stored correctly
      const storedSeed = localStorage.getItem('ephemeralSeed');
      const storedRandomness = localStorage.getItem('zklogin-randomness');
      
      if (!storedSeed || !storedRandomness) {
        throw new Error('Failed to store authentication data in localStorage');
      }
      
      debugStorage();
      const publicKey = seedKeyPair.getPublicKey();
      
      // Generate nonce using the public key
      const nonce = generateNonce(publicKey, 100, newRandomness);
      
      // Standard OAuth parameters
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce: nonce,
        // Ensure we're using implicit flow
        response_mode: 'fragment'
      });
      
      // Redirect to Google OAuth
      const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      window.location.href = loginUrl;
      
      // Call the onLogin callback if provided
      if (onLogin) {
        onLogin();
      }
    } catch (error) {
      // console.error('Login initialization failed:', error);
      alert('Failed to initiate login. Please try again: ' + String(error));
    }
  }, [setEphemeralKeyPair, setRandomness, onLogin]);

  return (
    <Button
      onClick={handleLogin}
      isLoading={isLoading}
      className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-800 hover:bg-gray-50 py-2 px-4 rounded-md shadow-sm w-full"
    >
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span>Sign in with Google</span>
    </Button>
  );
};

export default ZkLoginButton;

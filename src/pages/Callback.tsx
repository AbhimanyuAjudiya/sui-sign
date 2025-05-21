import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useUser } from '../context/UserContext';
import { ZkLoginAccount, generateDeterministicSalt, restoreEphemeralKeyPair } from '../utils/zkLogin';
import { debugStorage } from '../utils/debug';

interface JwtClaims {
  iss: string;
  aud: string;
  sub: string;
  nonce: string;
  email?: string;
  name?: string;
}

const Callback = () => {
  const navigate = useNavigate();
  const { 
    setZkLoginAccount, 
    userSalt, setUserSalt, 
    setJwt, 
    setEphemeralKeyPair
  } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const processingRef = useRef(false);
  
  // The URL of your zkLogin prover service
  const proverUrl = import.meta.env.VITE_ZK_LOGIN_PROVER_URL;

  useEffect(() => {
    const processCallback = async () => {
      if (processingRef.current) return;
      processingRef.current = true;
      
      debugStorage();
      
      try {
        // Extract ID token from URL fragment (not query params)
        let idToken;
        
        // Check if we have a hash fragment
        if (window.location.hash) {
          // Parse the hash fragment (removing the # character)
          const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
          idToken = fragmentParams.get('id_token');
        }
        
        // Fallback to query params if not found in fragment
        if (!idToken) {
          const urlParams = new URLSearchParams(window.location.search);
          idToken = urlParams.get('id_token');
          
          // Check for OAuth error responses
          const error = urlParams.get('error');
          const errorDescription = urlParams.get('error_description');
          
          if (error) {
            throw new Error(`OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
          }
        }
        
        // Restore saved ephemeral key from session storage
        const currentEphemeralKeyPair: Ed25519Keypair | null = restoreEphemeralKeyPair();
        if (!currentEphemeralKeyPair) {
          setError('No ephemeral keypair found. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        // Set ephemeral keypair in context
        setEphemeralKeyPair(currentEphemeralKeyPair);
        
        if (!idToken) {
          setError('No ID token found in callback.');
          setLoading(false);
          return;
        }
        
        setJwt(idToken);
        
        // Decode the JWT to get user information
        const decodedJwt = jwtDecode<JwtClaims>(idToken);
        
        if (!decodedJwt.sub) {
          setError('JWT does not contain a subject claim (sub).');
          setLoading(false);
          return;
        }
          
        // Deterministically generate a salt based on user's sub claim if one doesn't exist
        let salt = userSalt;
        if (!salt) {
          // Check localStorage directly to ensure we don't miss a persisted salt
          salt = localStorage.getItem('zklogin-user-salt');
          
          if (!salt) {
            // Generate a deterministic salt based on the user's sub claim
            // This ensures the same user always gets the same salt and address
            salt = generateDeterministicSalt(decodedJwt.sub);
            
            // Save the salt for future use
            setUserSalt(salt);
          } else {
            // Sync context with the localStorage value
            setUserSalt(salt);
          }
        }
        
        // Create zkLogin account
        const newAccount = new ZkLoginAccount({
          ephemeralKeyPair: currentEphemeralKeyPair,
          jwt: idToken,
          salt: salt,
          userIdentifier: decodedJwt.sub,
          proverUrl: proverUrl,
          keyClaimName: 'sub',
        });
        
        // Store the salt and address mapping to localStorage for easier debugging
        try {
          const addressMap = JSON.parse(localStorage.getItem('debug-address-map') || '{}');
          addressMap[salt] = newAccount.address;
          localStorage.setItem('debug-address-map', JSON.stringify(addressMap));
        } catch {
          // Failed to update debug address map
        }
        
        // Initialize the account (fetches ZK proof)
        try {
          await newAccount.initialize();
        } catch {
          // We'll continue even if the proof fails - the address is already generated
        }
        
        // Set account in context
        setZkLoginAccount(newAccount);
        
        // Ensure all authentication data is correctly saved in localStorage
        localStorage.setItem('zklogin-jwt', idToken);
        localStorage.setItem('zklogin-user-salt', salt);
        localStorage.setItem('user', JSON.stringify({
          address: newAccount.address,
          name: 'Sui User',
          isAuthenticated: true
        }));
        
        // Store the proof if available
        if (newAccount.zkProof) {
          localStorage.setItem('zklogin-proof', JSON.stringify(newAccount.zkProof));
        }
        
        // Verify session integrity
        const verification = newAccount.validateSession();
        if (!verification) {
          // console.warn('Session validation failed. Session may not persist correctly.');
        }
        
        // Double-check data exists in localStorage before redirecting
        const hasUser = !!localStorage.getItem('user');
        const hasJwt = !!localStorage.getItem('zklogin-jwt');
        const hasSalt = !!localStorage.getItem('zklogin-user-salt');
        const hasKeyPair = !!localStorage.getItem('ephemeralSeed');
        
        if (!hasUser || !hasJwt || !hasSalt || !hasKeyPair) {
          // console.warn('Missing critical session data:', {
          //   hasUser, hasJwt, hasSalt, hasKeyPair
          // });
        }
        
        debugStorage();
        
        // Force navigation with slight delay to ensure state updates
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } catch (zkError: unknown) {
        const errorMessage = zkError instanceof Error ? zkError.message : 'Unknown error';
        setError(`ZkLogin initialization failed: ${errorMessage}`);
        setLoading(false);
      }
    };

    processCallback();
    
    // Add safety timeout for long processing
    const safetyTimeout = setTimeout(() => {
      if (processingRef.current) {
        navigate('/dashboard', { replace: true });
      }
    }, 10000);
    
    return () => clearTimeout(safetyTimeout);
  }, [navigate, proverUrl, setEphemeralKeyPair, setJwt, setUserSalt, setZkLoginAccount, userSalt]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-lg">Processing login...</p>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-red-600 mb-3">Authentication Error</h3>
        <p className="text-gray-700 mb-4">{error}</p>
        <div className="text-xs text-gray-500 mb-4">
          <p>Debug info:</p>
          <p>URL: {window.location.href}</p>
          <p>Has fragment: {window.location.hash ? 'Yes' : 'No'}</p>
          <p>Query params: {window.location.search}</p>
          <p>Redirect URI: {import.meta.env.VITE_REDIRECT_URI || 'Not set'}</p>
          <p>Origin: {window.location.origin}</p>
          <p>Ephemeral Key: {localStorage.getItem('ephemeralSeed') ? 'Present' : 'Missing'}</p>
          <p>JWT: {localStorage.getItem('zklogin-jwt') ? 'Present' : 'Missing'}</p>
          <p>Salt: {localStorage.getItem('zklogin-user-salt') ? 'Present' : 'Missing'}</p>
        </div>
        <a 
          href="/login" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Try logging in again
        </a>
      </div>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-lg">Login successful! Redirecting...</p>
    </div>
  );
};

export default Callback;

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { generateSalt } from '../services/suiService';
import { useAccount } from '../context/AccountProvider';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient } from '@mysten/sui/client';
import { ZkLoginAccount } from '../services/suiService';
import { generateNonce } from '@mysten/sui/zklogin';

interface JwtClaims {
  iss: string;
  aud: string;
  sub: string;
  nonce: string;
  email?: string;
  name?: string;
}

const CallbackPage = () => {
  const navigate = useNavigate();
  const { 
    setAccount, 
    userSalt, setUserSalt, 
    setJwt, 
    setEphemeralKeyPair,
    setRandomness
  } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const suiRpcUrl = import.meta.env.VITE_SUI_FULLNODE_RPC_URL;
  const proverUrl = import.meta.env.VITE_ZK_LOGIN_PROVER_URL;
  
  // Use a ref to prevent multiple callback processing attempts
  const processingRef = useRef(false);

  useEffect(() => {
    // Prevent multiple processing attempts
    if (processingRef.current) return;
    processingRef.current = true;
    
    const processCallback = async () => {
      try {
        // Get token from URL
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');
        
        if (!idToken) {
          setError('No id_token found in URL');
          setLoading(false);
          return;
        }
        
        // Store JWT
        setJwt(idToken);
        
        // Retrieve seed and randomness
        const storedSeedStr = sessionStorage.getItem('ephemeralSeed');
        const storedRandomness = sessionStorage.getItem('randomness');
        
        if (!storedSeedStr || !storedRandomness) {
          setError('Authentication data not found. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        // Log for debugging
        console.log('Retrieved raw seed bytes:', storedSeedStr);
        console.log('Retrieved randomness:', storedRandomness);
        
        // Recreate keypair from seed - CRITICAL to use the same exact seed
        const seed = new Uint8Array(JSON.parse(storedSeedStr));
        const currentEphemeralKeyPair = Ed25519Keypair.fromSecretKey(seed);
        
        // Get the same public key format used in login
        const publicKey = currentEphemeralKeyPair.getPublicKey();
        // IMPORTANT: Convert to string format for nonce calculation
        const publicKeyString = publicKey
        console.log('Recreated public key object:', publicKey);
        console.log('Recreated public key string:', publicKeyString);
        
        // Calculate the same nonce that was used in login
        const calculatedNonce = generateNonce(publicKeyString, 100, storedRandomness);
        console.log('Calculated nonce for verification:', calculatedNonce);
        
        // Store in context
        setEphemeralKeyPair(currentEphemeralKeyPair);
        setRandomness(storedRandomness);
        
        // Decode JWT
        const decodedJwt = jwtDecode<JwtClaims>(idToken);
        console.log('JWT nonce from token:', decodedJwt.nonce);

        if (!decodedJwt.sub) {
          setError('Subject claim (sub) not found in JWT. Cannot create user identifier.');
          setLoading(false);
          return;
        }
        
        // Generate salt if needed
        let salt = userSalt;
        // Always check localStorage for salt to ensure persistence across reloads
        if (!salt) {
          salt = localStorage.getItem('zklogin-user-salt');
        }
        if (!salt) {
          salt = generateSalt();
          setUserSalt(salt);
        } else {
          setUserSalt(salt); // Sync context with localStorage value
        }
        
        // Create SUI client
        const suiClient = new SuiClient({ url: suiRpcUrl });
        
        try {
          // Create zkLogin account
          console.log('Creating ZkLoginAccount with:');
          console.log('- Public key:', publicKey);
          console.log('- Calculated nonce:', calculatedNonce);
          
          const newAccount = new ZkLoginAccount({
            client: suiClient,
            ephemeralKeyPair: currentEphemeralKeyPair,
            jwt: idToken,
            salt: salt,
            userIdentifier: decodedJwt.sub,
            proverUrl: proverUrl,
            keyClaimName: 'sub',
          });
          
          console.log('About to initialize zkLogin account...');
          await newAccount.initialize();
          console.log('zkLogin account initialized successfully');
          
          // Set account and navigate to home
          setAccount(newAccount);
          sessionStorage.removeItem('ephemeralSeed');
          sessionStorage.removeItem('randomness');
          
          // Force the navigation with a slight delay to ensure React state updates
          setTimeout(() => {
            console.log('Navigating to home page');
            navigate('/home', { replace: true });
          }, 100);
        } catch (zkError) {
          console.error('ZkLogin initialization error:', zkError);
          setError(`ZkLogin initialization failed: ${zkError.message || 'Unknown error'}`);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Callback processing error:', err);
        setError(`Failed to process login: ${err.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    processCallback();
    
    // Add a safety navigation timeout in case processing takes too long
    const safetyTimeout = setTimeout(() => {
      if (processingRef.current) {
        console.log('Safety timeout triggered - forcing navigation to home');
        navigate('/home', { replace: true });
      }
    }, 5000);
    
    return () => clearTimeout(safetyTimeout);
  }, []); // Empty dependency array to run only once

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <p>Processing login...</p>
      <div style={{ 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #6082B6',
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        animation: 'spin 2s linear infinite',
        margin: '20px auto'
      }}></div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
  
  if (error) return (
    <div style={{ 
      maxWidth: '500px', 
      margin: '100px auto', 
      padding: '20px', 
      textAlign: 'center',
      border: '1px solid #f8d7da',
      backgroundColor: '#f8d7da',
      color: '#721c24',
      borderRadius: '4px'
    }}>
      <h3>Authentication Error</h3>
      <p>{error}</p>
      <a href="/" style={{ color: '#0066cc', textDecoration: 'none' }}>
        Try logging in again
      </a>
    </div>
  );

  return <p style={{ textAlign: 'center', marginTop: '100px' }}>Login successful! Redirecting...</p>;
};

export default CallbackPage;
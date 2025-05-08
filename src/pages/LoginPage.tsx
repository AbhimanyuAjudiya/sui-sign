import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateRandomness, generateNonce } from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useAccount } from '../context/AccountProvider';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;

const LoginPage = () => {
  const navigate = useNavigate();
  const { setEphemeralKeyPair, setRandomness, account } = useAccount();
  
  useEffect(() => {
    if (account) {
      navigate('/home');
    }
  }, [account, navigate]);

  const handleLogin = async () => {
    try {
      // Start fresh
      sessionStorage.clear();
      
      // Create keypair using the SDK's method
      const ephemeralKeyPair = new Ed25519Keypair();
      setEphemeralKeyPair(ephemeralKeyPair);
      
      // Create a proper random seed - do NOT use secretKey.toString()
      // This will be used to recreate the exact keypair later
      const seed = new Uint8Array(32);
      window.crypto.getRandomValues(seed);
      
      // Create a keypair from this seed
      const seedKeyPair = Ed25519Keypair.fromSecretKey(seed);
      setEphemeralKeyPair(seedKeyPair);
      
      // Store the raw bytes of the seed
      sessionStorage.setItem('ephemeralSeed', JSON.stringify(Array.from(seed)));
      
      // Generate randomness
      const newRandomness = generateRandomness();
      setRandomness(newRandomness);
      sessionStorage.setItem('randomness', newRandomness);
      
      // Get the proper Sui public key format - CRITICAL to convert to string
      const publicKey = seedKeyPair.getPublicKey();
      const publicKeyString = publicKey;
      
      // Generate nonce using the string representation of the public key
      const nonce = generateNonce(publicKeyString, 100, newRandomness);
      
      // Debug info - log both object and string to verify
      console.log('Login public key object:', publicKey);
      console.log('Login public key string:', publicKeyString);
      console.log('Login randomness:', newRandomness); 
      console.log('Login nonce:', nonce);
      
      // Standard OAuth parameters
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'id_token',
        scope: 'openid email profile',
        nonce: nonce,
      });
      
      const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      window.location.href = loginUrl;
    } catch (error) {
      console.error('Login failed:', error);
      alert('Failed to initiate login. Please try again.');
    }
  };

  return (
    <div className="login-container" style={{ 
      maxWidth: '500px', 
      margin: '0 auto', 
      padding: '40px', 
      textAlign: 'center', 
      marginTop: '100px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      borderRadius: '8px'
    }}>
      <h1>Sui zkLogin Demo</h1>
      <p>Sign in with Google to authenticate with Sui zkLogin</p>
      <button 
        onClick={handleLogin}
        style={{
          backgroundColor: '#6082B6',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '16px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Login with Google
      </button>
    </div>
  );
};

export default LoginPage;
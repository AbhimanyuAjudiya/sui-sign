import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../context/AccountProvider';
import { useSuiClient } from '../context/SuiClientProvider';
import { Transaction } from '@mysten/sui/transactions';


const HomePage = () => {
  const navigate = useNavigate();
  const { account, setAccount, jwt, userSalt, ephemeralKeyPair } = useAccount();
  const { client } = useSuiClient();
  const [balance, setBalance] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [txDigest, setTxDigest] = useState<string | null>(null);

  useEffect(() => {
    if (!account && !localStorage.getItem('jwt')) { // Check if user is truly logged out
      navigate('/');
    } else if (account && !balance) {
      fetchBalance();
    }
  }, [account, navigate, balance]);

  const fetchBalance = async () => {
    if (!account || !account.address) return;
    try {
      const coinBalance = await client.getBalance({ owner: account.address });
      setBalance((parseInt(coinBalance.totalBalance) / 1_000_000_000).toString() + ' SUI');
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setMessage('Failed to fetch balance.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    // localStorage.removeItem('zklogin-user-salt'); // Or manage salt server-side
    localStorage.removeItem('ephemeralKeyPair');
    localStorage.removeItem('randomness');
    setAccount(null);
    // setUserSalt(null); // Context will clear it from localStorage
    // setJwt(null);
    // setEphemeralKeyPair(null);
    // setRandomness(null);
    navigate('/');
  };

  const handleSimpleTransaction = async () => {
    if (!account || !ephemeralKeyPair) {
        setMessage("Account or ephemeral key pair not ready.");
        return;
    }
    setMessage("Preparing transaction...");
    setTxDigest(null);

    try {
        const txb = new Transaction();
        // Example: Split a SUI coin (if user has one)
        // This is a simple transaction that doesn't require creating objects.
        // For more complex interactions, you'd call smart contract functions.
        const [coin] = txb.splitCoins(txb.gas, [txb.pure(new Uint8Array([1000]))]); // Split 1000 MIST
        txb.transferObjects([coin], txb.pure(new TextEncoder().encode(account.address))); // Transfer it back to self
        txb.setSender(account.address);
        
        // Sign and execute the transaction
        const result = await client.signAndExecuteTransaction({
            transaction: txb,
            signer: account.getKeyPair(), // Uses the ZkLoginAccount's signing capability
            requestType: 'WaitForLocalExecution',
            options: {
                showEffects: true,
                showObjectChanges: true,
            },
        });

        setMessage(`Transaction successful!`);
        setTxDigest(result.digest);
        fetchBalance(); // Refresh balance
        console.log('Transaction Result:', result);

    } catch (error: any) {
        console.error("Transaction failed:", error);
        setMessage(`Transaction failed: ${error.message}`);
    }
  };


  if (!account) return <p>Loading account details or <a href="/">Login</a>...</p>;

  return (
    <div>
      <h1>Welcome to Sui!</h1>
      <p>You are logged in with zkLogin.</p>
      <p><strong>User Salt:</strong> {userSalt || 'Not set'}</p>
      <p><strong>Your Sui Address:</strong> {account.address}</p>
      <p><strong>Balance:</strong> {balance || 'Loading...'}</p>
      {jwt && <p><strong>JWT (first 30 chars):</strong> {jwt.substring(0,30)}...</p>}
      
      <button onClick={handleSimpleTransaction}>Send Simple Test Transaction</button>
      {message && <p style={{ color: txDigest ? 'green' : 'red' }}>{message}</p>}
      {txDigest && <p>Transaction Digest: <a href={`https://suiscan.xyz/devnet/tx/${txDigest}`} target="_blank" rel="noopener noreferrer">{txDigest}</a></p>}
      
      <button onClick={handleLogout} style={{ marginTop: '20px' }}>Logout</button>
    </div>
  );
};

export default HomePage;
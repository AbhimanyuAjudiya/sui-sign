import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import AddressDisplay from '../components/common/AddressDisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import Button from '../components/ui/Button';
import { Shield, User as UserIcon, ExternalLink } from 'lucide-react';
import Avatar from '../components/ui/Avatar';

/**
 * User profile page displaying user details and Sui blockchain information
 */
const Profile: React.FC = () => {
  const { user } = useUser();
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!user?.address) return;
      setBalanceLoading(true);
      setBalanceError(null);
      try {
        // Dynamically import to avoid SSR issues
        const { suiClient } = await import('../utils/suiClient');
        const result = await suiClient.getBalance({ owner: user.address });
        // SUI uses 9 decimals (1 SUI = 1_000_000_000 MIST)
        setBalance((parseInt(result.totalBalance) / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 9 }) + ' SUI');
      } catch {
        setBalanceError('Failed to fetch balance');
      } finally {
        setBalanceLoading(false);
      }
    };
    fetchBalance();
  }, [user?.address]);

  // Determine network name from env
  let networkLabel = 'Unknown';
  const rpcUrl = import.meta.env.VITE_SUI_FULLNODE_RPC_URL || '';
  if (rpcUrl.includes('devnet')) networkLabel = 'Sui Devnet';
  else if (rpcUrl.includes('testnet')) networkLabel = 'Sui Testnet';
  else if (rpcUrl.includes('mainnet')) networkLabel = 'Sui Mainnet';
  else if (import.meta.env.VITE_SUI_NETWORK) networkLabel = `Sui ${import.meta.env.VITE_SUI_NETWORK.charAt(0).toUpperCase() + import.meta.env.VITE_SUI_NETWORK.slice(1)}`;

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserIcon className="mr-2 h-6 w-6 text-primary-600" />
              Account Details
            </CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-center mb-6">
                <Avatar
                  src={user.profilePic}
                  alt={`Profile picture for ${user.email || 'user'}`}
                  size="lg"
                />
              </div>
              
              <div className="space-y-2">
                {/* Removed Name field */}
                {user.email && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-500">Email:</span>
                    <span>{user.email}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Authentication:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Shield className="mr-1 h-3 w-3" />
                    Google zkLogin
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-6 w-6 text-primary-600" />
              Blockchain Identity
            </CardTitle>
            <CardDescription>Your Sui blockchain information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-500 block mb-1">Sui Address:</span>
                  <div className="p-3 bg-gray-100 rounded-lg break-all font-mono text-sm">
                    {user.address}
                  </div>
                  <div className="mt-2 flex justify-end">
                    <AddressDisplay 
                      address={user.address} 
                      startChars={10} 
                      endChars={10}
                      className="text-primary-600"
                    />
                  </div>
                </div>
                {/* Signed-in Gmail */}
                {user.email && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium text-gray-500">Signed-in Gmail:</span>
                    <span className="font-mono text-sm">{user.email}</span>
                  </div>
                )}
                {/* SUI Balance */}
                <div className="flex justify-between items-center mt-2">
                  <span className="font-medium text-gray-500">SUI Balance:</span>
                  <span className="font-mono text-sm">
                    {balanceLoading ? 'Loading...' : balanceError ? <span className="text-red-500">{balanceError}</span> : balance}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-500">Network:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {networkLabel}
                  </span>
                </div>
                
                {/* Faucet Button - Only show on testnet or devnet */}
                {(networkLabel === 'Sui Testnet' || networkLabel === 'Sui Devnet') && (
                  <div className="mt-4">
                    <Button
                      onClick={() => window.open(`https://faucet.sui.io/?address=${user.address}`, '_blank', 'noopener,noreferrer')}
                      fullWidth
                      icon={<ExternalLink className="h-4 w-4 mr-2" />}
                    >
                      Get Testnet Tokens
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;

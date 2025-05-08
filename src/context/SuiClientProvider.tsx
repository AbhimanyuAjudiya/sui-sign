import { createContext, useContext, useMemo } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

interface SuiClientContextType {
  client: SuiClient;
  rpcUrl: string;
}

const SuiClientContext = createContext<SuiClientContextType | null>(null);

export const SuiClientProvider = ({ children }: { children: React.ReactNode }) => {
  const rpcUrl = import.meta.env.VITE_SUI_FULLNODE_RPC_URL || getFullnodeUrl('devnet');
  const client = useMemo(() => new SuiClient({ url: rpcUrl }), [rpcUrl]);

  return (
    <SuiClientContext.Provider value={{ client, rpcUrl }}>
      {children}
    </SuiClientContext.Provider>
  );
};

export const useSuiClient = () => {
  const context = useContext(SuiClientContext);
  if (!context) {
    throw new Error('useSuiClient must be used within a SuiClientProvider');
  }
  return context;
};
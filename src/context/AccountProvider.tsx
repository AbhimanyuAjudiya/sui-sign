import { createContext, useContext, useState} from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { ZkLoginAccount } from '../services/suiService'; // We'll create this

interface AccountContextType {
  account: ZkLoginAccount | null;
  setAccount: Dispatch<SetStateAction<ZkLoginAccount | null>>;
  ephemeralKeyPair: Ed25519Keypair | null;
  setEphemeralKeyPair: Dispatch<SetStateAction<Ed25519Keypair | null>>;
  userSalt: string | null;
  setUserSalt: Dispatch<SetStateAction<string | null>>;
  jwt: string | null;
  setJwt: Dispatch<SetStateAction<string | null>>;
  randomness: string | null;
  setRandomness: Dispatch<SetStateAction<string | null>>;
}

const AccountContext = createContext<AccountContextType | null>(null);

export const AccountProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<ZkLoginAccount | null>(null);
  const [ephemeralKeyPair, setEphemeralKeyPair] = useState<Ed25519Keypair | null>(null);
  const [userSalt, setUserSalt] = useState<string | null>(localStorage.getItem('zklogin-user-salt'));
  const [jwt, setJwt] = useState<string | null>(null);
  const [randomness, setRandomness] = useState<string | null>(null);


  return (
    <AccountContext.Provider value={{ 
        account, setAccount, 
        ephemeralKeyPair, setEphemeralKeyPair,
        userSalt, setUserSalt: (salt) => {
            if (salt) localStorage.setItem('zklogin-user-salt', salt); else localStorage.removeItem('zklogin-user-salt');
            setUserSalt(salt);
        },
        jwt, setJwt,
        randomness, setRandomness
    }}>
      {children}
    </AccountContext.Provider>
  );
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
};
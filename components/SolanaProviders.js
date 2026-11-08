'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_URL } from '@/solana/constants';

// wallets=[]: Phantom, Solflare, Backpack etc. are auto-detected via Wallet Standard.
// On Android Chrome the adapter also offers Mobile Wallet Adapter automatically.
export default function SolanaProviders({ children }) {
  const wallets = useMemo(() => [], []);
  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect onError={(e) => console.warn('[wallet]', e?.message || e)}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const CLUSTER = 'devnet';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(CLUSTER);

// Set NEXT_PUBLIC_PROGRAM_ID in .env.local (and in Vercel) after deploying in Solana Playground.
// If it is missing or invalid, on-chain features are disabled and the game still works (fallback rule).
export const PROGRAM_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!raw) return null;
  try {
    return new PublicKey(raw.trim());
  } catch {
    return null;
  }
})();

export const CHAIN_ENABLED = PROGRAM_ID !== null;

export const explorerTx = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
export const explorerAddr = (addr) => `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;

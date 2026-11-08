import { PublicKey, clusterApiUrl } from '@solana/web3.js';

export const CLUSTER = 'devnet';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || clusterApiUrl(CLUSTER);

// Set NEXT_PUBLIC_PROGRAM_ID in .env.local (and in Vercel) after deploying program/lib.rs in Solana Playground.
// With a program ID: "program" mode, where the on-chain program re-computes and stores your score.
// Without one: "memo" mode. Each finished day is still written to Solana Devnet as a signed transaction
// using Solana's built-in Memo program, so the game always really uses the network.
export const PROGRAM_ID = (() => {
  const raw = process.env.NEXT_PUBLIC_PROGRAM_ID;
  if (!raw) return null;
  try {
    return new PublicKey(raw.trim());
  } catch {
    return null;
  }
})();

export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export const CHAIN_MODE = PROGRAM_ID ? 'program' : 'memo';
export const CHAIN_ENABLED = true;

export const explorerTx = (sig) => `https://explorer.solana.com/tx/${sig}?cluster=${CLUSTER}`;
export const explorerAddr = (addr) => `https://explorer.solana.com/address/${addr}?cluster=${CLUSTER}`;

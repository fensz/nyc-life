// A temporary Devnet wallet for players with no wallet installed. Its key lives only in this browser's
// localStorage and only ever holds free Devnet test SOL. Never use a burner like this on mainnet.
import { Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';

const KEY = 'nyc-life-devnet-wallet-v1';
const MIN_BALANCE = 0.005 * LAMPORTS_PER_SOL;

export function loadBurner() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  } catch {
    // storage unavailable or corrupt: fall through to null
  }
  return null;
}

export function createBurner() {
  const kp = Keypair.generate();
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(kp.secretKey)));
  } catch {
    // still works for this page load
  }
  return kp;
}

// Ask the Devnet faucet for a little SOL if the wallet is nearly empty. Returns the new balance in lamports.
export async function fundBurner(connection, kp) {
  const balance = await connection.getBalance(kp.publicKey, 'confirmed');
  if (balance >= MIN_BALANCE) return balance;
  const signature = await connection.requestAirdrop(kp.publicKey, 0.1 * LAMPORTS_PER_SOL);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return connection.getBalance(kp.publicKey, 'confirmed');
}

// Same shape as the wallet adapter's sendTransaction, but it signs locally.
export function burnerSender(kp) {
  return async (tx, connection) => {
    tx.sign(kp);
    return connection.sendRawTransaction(tx.serialize());
  };
}

import { Buffer } from 'buffer';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { PROGRAM_ID, MEMO_PROGRAM_ID } from './constants';
import { PLAYER_SEED, encodeInitPlayer, encodeSubmitDay, decodePlayerStats } from './encoding';

export function findPlayerPda(owner, programId = PROGRAM_ID) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(PLAYER_SEED), owner.toBuffer()],
    programId
  );
  return pda;
}

// Account order must match `InitPlayer` in program/lib.rs
export function buildInitPlayerIx(owner, pda) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(encodeInitPlayer()),
  });
}

// Account order must match `SubmitDay` in program/lib.rs
export function buildSubmitDayIx(owner, pda, actions) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: pda, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from(encodeSubmitDay(actions)),
  });
}

export async function fetchPlayerStats(connection, owner) {
  const pda = findPlayerPda(owner);
  const info = await connection.getAccountInfo(pda, 'confirmed');
  if (!info) return null;
  return { pda, ...decodePlayerStats(info.data) };
}

/**
 * Sends the day's 3 actions to the program. The program computes the score.
 * onStage(stage) is called with 'signing' then 'confirming'.
 */
export async function recordDay({ connection, publicKey, sendTransaction, actions, onStage }) {
  const pda = findPlayerPda(publicKey);
  const existing = await connection.getAccountInfo(pda, 'confirmed');

  const tx = new Transaction();
  if (!existing) tx.add(buildInitPlayerIx(publicKey, pda));
  tx.add(buildSubmitDayIx(publicKey, pda, actions));

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  onStage?.('signing');
  const signature = await sendTransaction(tx, connection);

  onStage?.('confirming');
  const conf = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (conf.value.err) throw new Error(`Transaction failed: ${JSON.stringify(conf.value.err)}`);

  const stats = await fetchPlayerStats(connection, publicKey);
  return { signature, pda, stats, initialized: !existing };
}

// Memo mode: no custom program needed. Writes the finished day to Solana Devnet using the built-in Memo
// program, signed by the player's wallet. `score` is the game's own score for the day.
export function memoText(actions, score) {
  return `NYC LIFE v1 | actions=${actions.join(',')} | score=${score}`;
}

export async function recordDayMemo({ connection, publicKey, sendTransaction, actions, score, onStage }) {
  const tx = new Transaction().add(
    new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }],
      data: Buffer.from(memoText(actions, score), 'utf8'),
    })
  );
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = publicKey;

  onStage?.('signing');
  const signature = await sendTransaction(tx, connection);

  onStage?.('confirming');
  const conf = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  if (conf.value.err) throw new Error(`Transaction failed: ${JSON.stringify(conf.value.err)}`);
  return { signature, memo: memoText(actions, score) };
}

// Turn wallet / RPC errors into short, human messages.
export function friendlyError(err) {
  const msg = String(err?.message || err || 'Unknown error');
  const logs = err?.logs || err?.transactionLogs || [];
  if (/reject|denied|cancel/i.test(msg)) return 'Cancelled in wallet';
  if (/no record of a prior credit|insufficient/i.test(msg + logs.join(' '))) {
    return 'Not enough Devnet SOL. Get some free at faucet.solana.com';
  }
  const progLog = [...logs].reverse().find((l) => /Program log: (AnchorError|Error)/.test(l));
  if (progLog) return progLog.replace('Program log: ', '');
  if (/airdrop|faucet|410|429|rate limit/i.test(msg)) return 'Get free Devnet SOL at faucet.solana.com, then try again';
  if (/blockhash|expired/i.test(msg)) return 'Network was slow. Please try again';
  return msg.length > 140 ? msg.slice(0, 140) + '…' : msg;
}

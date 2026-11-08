'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { bus } from '@/game/bus';
import { ACTIONS } from '@/game/rules';
import { CHAIN_MODE, PROGRAM_ID, explorerTx, explorerAddr } from '@/solana/constants';
import { fetchPlayerStats, recordDay, recordDayMemo, friendlyError } from '@/solana/nycLifeClient';
import { loadBurner, createBurner, fundBurner, burnerSender } from '@/solana/burner';

const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const PROGRAM_MODE = CHAIN_MODE === 'program';

function emitStatus(state, message, extra = {}) {
  bus.emit('chain-status', { state, message, ...extra });
}

export default function ChainPanel() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, wallets } = useWallet();
  const { setVisible } = useWalletModal();

  const [day, setDay] = useState(null); // { actions, score }
  const [status, setStatus] = useState({ state: 'idle' });
  const [stats, setStats] = useState(null);
  const [balance, setBalance] = useState(null);
  const [burner, setBurner] = useState(null); // temporary Devnet wallet (Keypair)
  const pendingRecord = useRef(false);
  const recordRef = useRef(() => {});

  // a connected wallet wins; otherwise the temporary wallet, if there is one
  const owner = connected && publicKey ? publicKey : burner ? burner.publicKey : null;
  const usingBurner = !(connected && publicKey) && !!burner;
  const hasInstalledWallet = wallets.some((w) => w.readyState === 'Installed');

  useEffect(() => {
    setBurner(loadBurner());
  }, []);

  // --- game events ---
  useEffect(() => {
    const onDay = (d) => {
      setDay(d);
      setStatus({ state: 'idle' });
    };
    const onReset = () => {
      setDay(null);
      setStatus({ state: 'idle' });
    };
    const onRequest = () => recordRef.current();
    bus.on('day-complete', onDay);
    bus.on('day-reset', onReset);
    bus.on('record-request', onRequest);
    return () => {
      bus.off('day-complete', onDay);
      bus.off('day-reset', onReset);
      bus.off('record-request', onRequest);
    };
  }, []);

  // --- wallet data ---
  const refresh = useCallback(async () => {
    if (!owner) return;
    try {
      const lamports = await connection.getBalance(owner, 'confirmed');
      setBalance(lamports / LAMPORTS_PER_SOL);
      if (PROGRAM_MODE) {
        const s = await fetchPlayerStats(connection, owner).catch(() => null);
        setStats(s);
        bus.emit('chain-stats', s ? { best: s.bestScore, days: s.daysCompleted } : null);
      }
    } catch (e) {
      console.warn('[chain] refresh failed', e);
    }
  }, [connection, owner]);

  useEffect(() => {
    if (owner) refresh();
    else {
      setBalance(null);
      setStats(null);
      bus.emit('chain-stats', null);
    }
  }, [owner, refresh]);

  // --- record ---
  const record = useCallback(async () => {
    if (!day) {
      emitStatus('error', 'Finish a day first');
      return;
    }
    if (status.state === 'signing' || status.state === 'confirming' || status.state === 'funding') return;

    let key = connected && publicKey ? publicKey : null;
    let send = sendTransaction;
    let temp = null;

    if (!key) {
      if (hasInstalledWallet && !burner) {
        // let the player pick their own wallet
        pendingRecord.current = true;
        emitStatus('connect', 'Choose a wallet to save this day on Solana Devnet');
        setVisible(true);
        return;
      }
      // no wallet installed: use a temporary Devnet wallet so recording is one click
      temp = burner || createBurner();
      setBurner(temp);
      key = temp.publicKey;
      send = burnerSender(temp);
      try {
        setStatus({ state: 'funding' });
        emitStatus('funding', 'Getting free Devnet SOL for your temporary wallet…');
        await fundBurner(connection, temp);
      } catch (e) {
        console.warn('[chain] airdrop failed', e);
        const message = 'This temporary wallet needs a little free Devnet SOL first. Copy its address below, get SOL at faucet.solana.com, then press Record again.';
        setStatus({ state: 'error', message, address: temp.publicKey.toBase58() });
        emitStatus('error', 'Get free Devnet SOL at faucet.solana.com, then press Record again.');
        return;
      }
    }

    try {
      const onStage = (stage) => {
        setStatus({ state: stage });
        emitStatus(
          stage,
          stage === 'signing'
            ? temp || (!connected && burner) ? 'Signing with your temporary wallet…' : 'Approve the transaction in your wallet…'
            : 'Confirming on Solana Devnet…'
        );
      };

      let done;
      if (PROGRAM_MODE) {
        const res = await recordDay({ connection, publicKey: key, sendTransaction: send, actions: day.actions, onStage });
        const s = res.stats;
        const matches = s && s.lastScore === day.score;
        const msg = s
          ? `Verified on-chain: ${s.lastScore}${matches ? ' (matches)' : ` (local ${day.score})`} · Best ${s.bestScore} · Day #${s.daysCompleted}`
          : 'Recorded on-chain';
        done = { state: 'verified', sig: res.signature, pda: res.pda.toBase58(), stats: s, matches };
        setStats(s);
        emitStatus('verified', msg, { explorerUrl: explorerTx(res.signature) });
        if (s) bus.emit('chain-stats', { best: s.bestScore, days: s.daysCompleted });
      } else {
        const res = await recordDayMemo({
          connection, publicKey: key, sendTransaction: send, actions: day.actions, score: day.score, onStage,
        });
        done = { state: 'verified', sig: res.signature, memo: res.memo };
        emitStatus('verified', `Saved on Solana Devnet · score ${day.score}`, { explorerUrl: explorerTx(res.signature) });
      }
      setStatus(done);
      connection.getBalance(key).then((l) => setBalance(l / LAMPORTS_PER_SOL)).catch(() => {});
    } catch (e) {
      console.warn('[chain] record failed', e);
      const message = friendlyError(e);
      setStatus({ state: 'error', message });
      emitStatus('error', message);
    }
  }, [day, connected, publicKey, burner, hasInstalledWallet, connection, sendTransaction, setVisible, status.state]);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  // If the player clicked "Record" before connecting, continue once connected.
  useEffect(() => {
    if (connected && pendingRecord.current && day) {
      pendingRecord.current = false;
      record();
    }
  }, [connected, day, record]);

  // --- render ---
  const noWalletOnMobile = isMobile() && !connected && !hasInstalledWallet;
  const siteUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const phantomLink = `https://phantom.app/ul/browse/${encodeURIComponent(siteUrl)}?ref=${encodeURIComponent(siteUrl)}`;
  const busy = ['signing', 'confirming', 'funding'].includes(status.state);
  const label = busy
    ? status.state === 'funding' ? 'Getting Devnet SOL…' : status.state === 'signing' ? 'Signing…' : 'Confirming…'
    : status.state === 'verified' ? 'Recorded ✓' : owner ? 'Record day on Solana' : 'Record day on Solana';

  return (
    <section className="chain-panel" aria-label="On-chain record">
      <div className="chain-head">
        <div>
          <h2>Your on-chain record</h2>
          <p className="sub">
            Solana Devnet ·{' '}
            {PROGRAM_MODE ? (
              <>program <a href={explorerAddr(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">{short(PROGRAM_ID.toBase58())}</a></>
            ) : (
              'every finished day is written to the chain as a transaction'
            )}
          </p>
        </div>
        <WalletMultiButton />
      </div>

      <p className="note" role="note">
        <strong>Heads up:</strong> saving a day to Solana costs a tiny network fee, paid in free <strong>Devnet test SOL</strong>
        (fake money, not real). Before you record, fund your wallet at{' '}
        <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a> (choose Devnet).
        The game is fully playable without recording.
      </p>

      {noWalletOnMobile && (
        <p className="note">
          No wallet found in this browser: no problem, tap Record and a free temporary Devnet wallet is made for you. Or{' '}
          <a className="btn-link" href={phantomLink}>open in Phantom</a>.
        </p>
      )}

      {owner && (
        <dl className="stats">
          <div><dt>{usingBurner ? 'Temp wallet' : 'Wallet'}</dt><dd>{short(owner.toBase58())}</dd></div>
          <div><dt>Balance</dt><dd>{balance === null ? '…' : `${balance.toFixed(3)} SOL`}</dd></div>
          {PROGRAM_MODE && <div><dt>Best score</dt><dd>{stats ? stats.bestScore : '-'}</dd></div>}
          {PROGRAM_MODE && <div><dt>Days lived</dt><dd>{stats ? stats.daysCompleted : 0}</dd></div>}
        </dl>
      )}
      {owner && balance !== null && balance < 0.001 && (
        <p className="note">
          This wallet has no Devnet SOL yet. Get free test SOL at{' '}
          <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a>
          {usingBurner ? (
            <>
              {' '}by pasting this address: <code>{owner.toBase58()}</code>{' '}
              <button className="btn-link" onClick={() => copyText(owner.toBase58())}>Copy address</button>
            </>
          ) : (
            ' (make sure your wallet is on Devnet).'
          )}
        </p>
      )}

      <div className="record-row">
        <div>
          {day ? (
            <p>
              Today: <strong>{day.actions.map((a) => ACTIONS[a].name).join(' → ')}</strong> · local score <strong>{day.score}</strong>
            </p>
          ) : (
            <p className="sub">Finish a day in the game, then save it here (or with the button on the results screen).</p>
          )}
        </div>
        <button className="btn-sol" onClick={record} disabled={!day || busy || status.state === 'verified'}>
          {label}
        </button>
      </div>

      {status.state === 'verified' && (
        <p className="ok">
          {PROGRAM_MODE ? (
            <>Verified on-chain: score {status.stats?.lastScore ?? '?'} {status.matches ? '(matches the game)' : ''} · </>
          ) : (
            <>Saved on Solana Devnet: <code>{status.memo}</code> · </>
          )}
          <a href={explorerTx(status.sig)} target="_blank" rel="noreferrer">View transaction</a>
          {PROGRAM_MODE && status.pda && (
            <> · <a href={explorerAddr(status.pda)} target="_blank" rel="noreferrer">View your record account</a></>
          )}
        </p>
      )}
      {status.state === 'error' && <p className="err">{status.message}</p>}
      {usingBurner && (
        <p className="sub">Temporary wallet: lives only in this browser and only holds free Devnet test SOL.</p>
      )}
    </section>
  );
}

function copyText(text) {
  try {
    navigator.clipboard.writeText(text);
  } catch {
    // clipboard unavailable: the address is shown on screen to copy by hand
  }
}

function short(s) {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

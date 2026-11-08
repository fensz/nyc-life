'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { bus } from '@/game/bus';
import { ACTIONS } from '@/game/rules';
import { CHAIN_ENABLED, PROGRAM_ID, explorerTx, explorerAddr } from '@/solana/constants';
import { fetchPlayerStats, recordDay, friendlyError } from '@/solana/nycLifeClient';

const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

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
  const pendingRecord = useRef(false);
  const recordRef = useRef(() => {});

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
    if (!publicKey || !CHAIN_ENABLED) return;
    try {
      const [lamports, s] = await Promise.all([
        connection.getBalance(publicKey, 'confirmed'),
        fetchPlayerStats(connection, publicKey).catch(() => null),
      ]);
      setBalance(lamports / LAMPORTS_PER_SOL);
      setStats(s);
      bus.emit('chain-stats', s ? { best: s.bestScore, days: s.daysCompleted } : null);
    } catch (e) {
      console.warn('[chain] refresh failed', e);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (connected) refresh();
    else {
      setBalance(null);
      setStats(null);
      bus.emit('chain-stats', null);
    }
  }, [connected, refresh]);

  // --- record ---
  const record = useCallback(async () => {
    if (!CHAIN_ENABLED) return;
    if (!day) {
      emitStatus('error', 'Finish a day first');
      return;
    }
    if (!connected || !publicKey) {
      pendingRecord.current = true;
      emitStatus('connect', 'Choose a wallet to save this day on Solana Devnet');
      setVisible(true);
      return;
    }
    if (status.state === 'signing' || status.state === 'confirming') return;
    try {
      const res = await recordDay({
        connection,
        publicKey,
        sendTransaction,
        actions: day.actions,
        onStage: (stage) => {
          setStatus({ state: stage });
          emitStatus(stage, stage === 'signing' ? 'Approve the transaction in your wallet…' : 'Confirming on Solana Devnet…');
        },
      });
      const s = res.stats;
      const matches = s && s.lastScore === day.score;
      const msg = s
        ? `Verified on-chain: ${s.lastScore}${matches ? ' (matches)' : ` (local ${day.score})`} · Best ${s.bestScore} · Day #${s.daysCompleted}`
        : 'Recorded on-chain';
      const done = { state: 'verified', sig: res.signature, pda: res.pda.toBase58(), stats: s, matches };
      setStatus(done);
      setStats(s);
      emitStatus('verified', msg, { explorerUrl: explorerTx(res.signature) });
      if (s) bus.emit('chain-stats', { best: s.bestScore, days: s.daysCompleted });
      connection.getBalance(publicKey).then((l) => setBalance(l / LAMPORTS_PER_SOL)).catch(() => {});
    } catch (e) {
      console.warn('[chain] record failed', e);
      const message = friendlyError(e);
      setStatus({ state: 'error', message });
      emitStatus('error', message);
    }
  }, [day, connected, publicKey, connection, sendTransaction, setVisible, status.state]);

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
  if (!CHAIN_ENABLED) {
    return (
      <section className="chain-panel muted" aria-label="On-chain record">
        <h2>On-chain record</h2>
        <p>On-chain recording is offline right now. The full game is still playable above.</p>
      </section>
    );
  }

  const noWalletOnMobile = isMobile() && !connected && wallets.length === 0;
  const siteUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const phantomLink = `https://phantom.app/ul/browse/${encodeURIComponent(siteUrl)}?ref=${encodeURIComponent(siteUrl)}`;
  const busy = status.state === 'signing' || status.state === 'confirming';

  return (
    <section className="chain-panel" aria-label="On-chain record">
      <div className="chain-head">
        <div>
          <h2>Your on-chain record</h2>
          <p className="sub">Solana Devnet · program <a href={explorerAddr(PROGRAM_ID.toBase58())} target="_blank" rel="noreferrer">{short(PROGRAM_ID.toBase58())}</a></p>
        </div>
        <WalletMultiButton />
      </div>

      {noWalletOnMobile && (
        <p className="note">
          No wallet found in this browser.{' '}
          <a className="btn-link" href={phantomLink}>Open in Phantom</a> to record your day.
        </p>
      )}

      {connected && publicKey && (
        <dl className="stats">
          <div><dt>Wallet</dt><dd>{short(publicKey.toBase58())}</dd></div>
          <div><dt>Balance</dt><dd>{balance === null ? '…' : `${balance.toFixed(3)} SOL`}</dd></div>
          <div><dt>Best score</dt><dd>{stats ? stats.bestScore : '—'}</dd></div>
          <div><dt>Days lived</dt><dd>{stats ? stats.daysCompleted : 0}</dd></div>
        </dl>
      )}
      {connected && balance === 0 && (
        <p className="note">This wallet has 0 Devnet SOL. Get free test SOL at <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet.solana.com</a> (make sure your wallet is on Devnet).</p>
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
          {busy ? (status.state === 'signing' ? 'Approve in wallet…' : 'Confirming…') : status.state === 'verified' ? 'Recorded ✓' : connected ? 'Record day on Solana' : 'Connect & record'}
        </button>
      </div>

      {status.state === 'verified' && (
        <p className="ok">
          Verified on-chain: score {status.stats?.lastScore ?? '?'} {status.matches ? '(matches the game)' : ''} ·{' '}
          <a href={explorerTx(status.sig)} target="_blank" rel="noreferrer">View transaction</a> ·{' '}
          <a href={explorerAddr(status.pda)} target="_blank" rel="noreferrer">View your record account</a>
        </p>
      )}
      {status.state === 'error' && <p className="err">{status.message}</p>}
    </section>
  );
}

function short(s) {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

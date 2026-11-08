'use client';

import { CHAIN_MODE } from '@/solana/constants';

const PROGRAM_MODE = CHAIN_MODE === 'program';

export function Hero() {
  return (
    <header className="hero">
      <p className="eyebrow">UB Hacking 2026 · a tiny life sim</p>
      <h1>
        NYC LIFE <span>One Day in New York</span>
      </h1>
      <p className="lede">
        {PROGRAM_MODE
          ? 'You just moved to the city with $20. Make three choices, live one day, and save your score on Solana, where the program re-scores your day so nobody can fake a high score.'
          : 'You just moved to the city with $20. Make three choices, live one day, and save your day to Solana Devnet as a signed transaction anyone can look up.'}
      </p>
      <a className="btn-play" href="#play">Play now ↓</a>
    </header>
  );
}

export function HowItWorks() {
  const steps = [
    ['1', 'Live your day', 'Walk around the block. Work, eat, nap, hang out. Each choice changes your money, energy and happiness.'],
    PROGRAM_MODE
      ? ['2', 'Send your choices', 'Your wallet signs a transaction with just your 3 actions. Never a score.']
      : ['2', 'Sign it', 'Your wallet (or a free temporary Devnet wallet) signs one transaction with your 3 actions and your score.'],
    PROGRAM_MODE
      ? ['3', 'Solana scores it', 'An Anchor program replays your day with the same rules, computes the score, and updates your best score and days lived in your own account (a PDA).']
      : ['3', 'It lives on Solana', 'The transaction is confirmed on Solana Devnet in about a second for a fraction of a cent. Open it in the Explorer to see your day.'],
  ];
  return (
    <section className="how" aria-labelledby="how-title">
      <h2 id="how-title">How it works</h2>
      <ol>
        {steps.map(([n, title, body]) => (
          <li key={n}>
            <span className="num">{n}</span>
            <div>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <p>
        Built with Next.js, Phaser 3 and Solana Devnet. All art is drawn in code. Devnet only: no real money.
      </p>
    </footer>
  );
}

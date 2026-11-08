'use client';

export function Hero() {
  return (
    <header className="hero">
      <p className="eyebrow">UB Hacking 2026 · a tiny life sim</p>
      <h1>
        NYC LIFE <span>One Day in New York</span>
      </h1>
      <p className="lede">
        You just moved to the city with $20. Make three choices, live one day, and save your score on Solana,
        where the program re-scores your day so nobody can fake a high score.
      </p>
      <a className="btn-play" href="#play">Play now ↓</a>
    </header>
  );
}

export function HowItWorks() {
  const steps = [
    ['1', 'Live your day', 'Walk around the block. Work, eat, nap, hang out. Each choice changes your money, energy and happiness.'],
    ['2', 'Send your choices', 'Your wallet signs a transaction with just your 3 actions. Never a score.'],
    ['3', 'Solana scores it', 'An Anchor program replays your day with the same rules, computes the score, and updates your best score and days lived in your own account (a PDA).'],
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
        Built with Next.js, Phaser 3, Anchor and Solana Devnet. All art is drawn in code. Devnet only: no real money.
      </p>
    </footer>
  );
}

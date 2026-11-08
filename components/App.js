'use client';

import { Buffer } from 'buffer';
import GameCanvas from './GameCanvas';
import SolanaProviders from './SolanaProviders';
import ChainPanel from './ChainPanel';
import RotateHint from './RotateHint';
import { Hero, HowItWorks, Footer } from './SiteSections';
import { busState } from '@/game/bus';
import { CHAIN_ENABLED, CHAIN_MODE } from '@/solana/constants';

if (typeof window !== 'undefined' && !window.Buffer) window.Buffer = Buffer;
busState.chainEnabled = CHAIN_ENABLED;
busState.chainMode = CHAIN_MODE;

export default function App() {
  return (
    <SolanaProviders>
      <main>
        <Hero />
        <section id="play" className="game-section">
          <div className="game-frame">
            <GameCanvas />
            <RotateHint />
          </div>
        </section>
        <ChainPanel />
        <HowItWorks />
        <Footer />
      </main>
    </SolanaProviders>
  );
}

'use client';

import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { makeConfig } from '@/game/config';

// Creates exactly one Phaser game for the lifetime of this component.
// React StrictMode mounts twice in dev; the cleanup destroys the first game, so only one canvas remains.
export default function GameCanvas() {
  const ref = useRef(null);

  useEffect(() => {
    const game = new Phaser.Game(makeConfig(ref.current));
    if (typeof window !== 'undefined') window.__NYC_GAME__ = game; // handy for debugging
    return () => {
      game.destroy(true);
      if (window.__NYC_GAME__ === game) window.__NYC_GAME__ = undefined;
    };
  }, []);

  return <div ref={ref} className="game-canvas" aria-label="NYC LIFE game" />;
}

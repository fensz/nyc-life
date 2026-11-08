'use client';

import dynamic from 'next/dynamic';

// The whole app (Phaser + wallet adapter) runs only in the browser. No SSR = no `window is not defined`.
const App = dynamic(() => import('./App'), {
  ssr: false,
  loading: () => (
    <main className="boot">
      <p>Loading NYC…</p>
    </main>
  ),
});

export default function ClientRoot() {
  return <App />;
}

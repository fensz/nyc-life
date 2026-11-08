'use client';

import { useState } from 'react';

// Shown only on narrow portrait screens (CSS decides). The game is landscape-first.
export default function RotateHint() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="rotate-hint" role="note">
      <div className="phone-icon" aria-hidden="true" />
      <p>Rotate your phone to play</p>
      <button type="button" onClick={() => setDismissed(true)}>Play anyway</button>
    </div>
  );
}

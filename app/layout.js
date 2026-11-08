import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';

export const metadata = {
  title: 'NYC LIFE: One Day in New York',
  description:
    'A tiny New York life sim. Three choices, one day, and your day is saved on Solana Devnet.',
  openGraph: {
    title: 'NYC LIFE: One Day in New York',
    description: 'Three choices. One day. Saved on Solana.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1b1f3b',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

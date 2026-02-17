import type { Metadata } from 'next';
import '../styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jumpedia',
  description: 'Training platform for high jump athletes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

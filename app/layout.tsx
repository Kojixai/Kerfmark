import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { BRAND_SYMBOLS } from '@/components/brand-symbols';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brackenbury OS',
  description: 'Estimating, projects, people and money for Brackenbury Home. Working prototype with demo data.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f4f5f4' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <div dangerouslySetInnerHTML={{ __html: BRAND_SYMBOLS }} />
        {children}
      </body>
    </html>
  );
}

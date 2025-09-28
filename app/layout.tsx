import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Private Judge - AI 토론 플랫폼',
  description: 'AI 심판과 배심원이 참여하는 개인 토론 플랫폼',
  keywords: ['토론', 'AI', '심판', '배심원', '논증'],
  authors: [{ name: 'Private Judge Team' }],
  openGraph: {
    title: 'Private Judge - AI 토론 플랫폼',
    description: 'AI 심판과 배심원이 참여하는 개인 토론 플랫폼',
    type: 'website',
    locale: 'ko_KR',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#1f2937' }
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}>
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}

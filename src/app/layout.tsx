import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Portal Tucan', template: '%s | Portal Tucan' },
  description: 'Portal de aprovação de conteúdo — Tucan Marketing Digital',
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Portal Tucan',
    description: 'Portal de aprovação de conteúdo — Tucan Marketing Digital',
    url: 'https://portal.agenciatucan.com.br',
    siteName: 'Portal Tucan',
    images: [{ url: 'https://portal.agenciatucan.com.br/api/og', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Portal Tucan',
    description: 'Portal de aprovação de conteúdo — Tucan Marketing Digital',
    images: ['https://portal.agenciatucan.com.br/api/og'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}

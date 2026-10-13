import type { Metadata, Viewport } from 'next';
import { PERFIL, siteUrl } from '@/lib/format';
import { fonteCorpo, fonteDisplay } from './fontes';
import './globals.css';

const descricao = `${PERFIL.bio} ${PERFIL.selo}: Shopee, Mercado Livre e mais.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${PERFIL.handle} · Achadinhos fofos com desconto`, template: `%s · ${PERFIL.handle}` },
  description: descricao,
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: PERFIL.handle,
    title: `${PERFIL.handle} · Achadinhos fofos com desconto`,
    description: descricao,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#FFF5F8', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonteDisplay.variable} ${fonteCorpo.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}

import { ImageResponse } from 'next/og';
import { PERFIL } from '@/lib/format';

export const alt = `${PERFIL.handle} · Achadinhos fofos com desconto`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const ROSE = 'linear-gradient(135deg,#FFE1EC 0%,#F7A8C4 35%,#E76F9A 65%,#F9C5D9 100%)';
const ROSE_TEXTO = 'linear-gradient(135deg,#B83268 0%,#D9578A 100%)';

const FRASE = 'Achadinhos fofos com desconto, direto das lojas';

/** Baixa só as letras usadas (a imagem é gerada no servidor, sem as fontes da página). */
async function carregarFonte(familia: string, texto: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${familia}&text=${encodeURIComponent(texto)}`,
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await fetch(url).then((r) => r.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

export default async function ImagemOg() {
  const [fraunces, nunito] = await Promise.all([
    carregarFonte('Fraunces:ital,wght@1,800', PERFIL.handle),
    carregarFonte('Nunito:wght@800', FRASE + PERFIL.selo),
  ]);
  const fontes = [
    ...(fraunces ? [{ name: 'Fraunces', data: fraunces, style: 'italic' as const, weight: 800 as const }] : []),
    ...(nunito ? [{ name: 'Nunito', data: nunito, style: 'normal' as const, weight: 800 as const }] : []),
  ];
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFF5F8', fontFamily: nunito ? 'Nunito' : 'sans-serif' }}>
        <div style={{ height: 18, background: ROSE }} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 28,
            margin: 48,
            borderRadius: 40,
            background: '#FFFFFF',
            border: '3px solid #F6CFDD',
            boxShadow: '0 16px 48px rgba(231,111,154,.18)',
          }}
        >
          <svg width="64" height="58" viewBox="0 0 24 22" fill="none" stroke="#E76F9A" strokeWidth="2" strokeLinejoin="round">
            <path d="M12 20.5S2 14.4 2 7.6A5 5 0 0 1 12 5a5 5 0 0 1 10 2.6c0 6.8-10 12.9-10 12.9Z" />
          </svg>
          <div
            style={{
              fontSize: 104,
              fontWeight: 800,
              fontStyle: 'italic',
              fontFamily: fraunces ? 'Fraunces' : 'serif',
              letterSpacing: -1,
              backgroundImage: ROSE_TEXTO,
              backgroundClip: 'text',
              color: 'transparent',
              paddingBottom: 8,
            }}
          >
            {PERFIL.handle}
          </div>
          <div style={{ fontSize: 38, fontWeight: 800, color: '#3B1F2B', maxWidth: 900, textAlign: 'center' }}>
            {FRASE}
          </div>
          <div
            style={{
              marginTop: 8,
              padding: '16px 40px',
              borderRadius: 999,
              backgroundImage: ROSE,
              color: '#3B1F2B',
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {PERFIL.selo}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontes.length ? fontes : undefined,
    },
  );
}

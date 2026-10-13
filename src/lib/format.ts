const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const brl = (n: number) => brlFmt.format(n);

/** Converte "1.234,56", "65,45" ou "65.45" em número. */
export function parseNumero(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).trim().replace(/[R$\s%]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function calcularDesconto(preco: number | null, precoAntes: number | null): number | null {
  if (!preco || !precoAntes || precoAntes <= preco) return null;
  return Math.round((1 - preco / precoAntes) * 100);
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const PRECO_VALIDADE_HORAS = 24;

/** Lojas que não informam o preço automaticamente (o preço é digitado no painel). */
const LOJAS_PRECO_MANUAL = /shopee|shope\.ee/i;

export const precoAutomatico = (link: string, loja?: string | null) => !LOJAS_PRECO_MANUAL.test(`${link} ${loja ?? ''}`);

/** Preço vencido: coletado há mais de 24 h e não travado manualmente. */
export function precoVencido(p: { preco: number | null; preco_atualizado_em: string | null; preco_manual: boolean }, agora = Date.now()) {
  if (p.preco == null) return true;
  if (p.preco_manual) return false;
  if (!p.preco_atualizado_em) return true;
  return agora - new Date(p.preco_atualizado_em).getTime() > PRECO_VALIDADE_HORAS * 3600_000;
}

export function tempoDesde(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (min < 60) return min <= 1 ? 'agora há pouco' : `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'há 1 dia' : `há ${d} dias`;
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const PERFIL = {
  handle: '@my_girlystyle',
  bio: 'Achadinhos fofos para girlies com desconto, direto do site das lojas.',
  selo: 'Links oficiais das lojas',
};

/**
 * Hosts que passam pelo otimizador de imagens (liberados no next.config.ts).
 * As fotos enviadas pelo painel (Supabase) já saem comprimidas e são mostradas direto.
 */
const HOSTS_OTIMIZADOS = [/\.mlstatic\.com$/, /\.susercontent\.com$/, /^cf\.shopee\.com\.br$/];

export function fotoOtimizavel(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    return protocol === 'https:' && HOSTS_OTIMIZADOS.some((h) => h.test(hostname));
  } catch {
    return false;
  }
}

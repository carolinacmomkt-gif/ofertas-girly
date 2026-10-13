import { parseNumero } from '@/lib/format';
import { supabaseServico } from '@/lib/supabase/server';
import { buscar, decodificarUrl, resolverLink } from './http';
import { lerDadosPagina, meta } from './html';
import type { AdaptadorLoja, Identificacao, ResultadoColeta } from './tipos';

/*
 * IDs do Mercado Livre guardados em produtos.loja_item_id:
 *   "MLB1234567890"   → anúncio (API /items)
 *   "p/MLB18725310"   → produto de catálogo (API /products)
 */

const API = 'https://api.mercadolibre.com';

export function extrairIdMercadoLivre(url: string, html = ''): string | null {
  const u = decodificarUrl(url);
  const wid = u.match(/[?#&](?:wid|item_id)=(MLB\d{6,})/i);
  if (wid) return wid[1].toUpperCase();
  const catalogo = u.match(/\/p\/(MLB\d{6,})/i);
  if (catalogo) return `p/${catalogo[1].toUpperCase()}`;
  const item = u.match(/\bMLB-?(\d{6,})/i);
  if (item) return `MLB${item[1]}`;

  // Link de afiliada (meli.la) cai na página "social", que informa o produto em destaque.
  if (html) {
    const gatilho = html.match(/"trigger":\{[^}]*?"item_id":"([^"]*)"[^}]*?"product_id":"([^"]*)"/);
    if (gatilho && /^MLB\d{6,}$/.test(gatilho[1])) return gatilho[1];
    if (gatilho && /^MLB\d{6,}$/.test(gatilho[2])) return `p/${gatilho[2]}`;
    const canonica = meta(html, 'og:url') ?? html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1];
    if (canonica && canonica !== url) return extrairIdMercadoLivre(canonica);
  }
  return null;
}

// ---------------------------------------------------------------------
// Token OAuth (client_credentials), guardado em tokens_lojas
// ---------------------------------------------------------------------
let tokenEmMemoria: { valor: string; expira: number } | null = null;

async function tokenMercadoLivre(): Promise<string | null> {
  if (process.env.ML_ACCESS_TOKEN) return process.env.ML_ACCESS_TOKEN;
  const id = process.env.ML_CLIENT_ID;
  const secret = process.env.ML_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tokenEmMemoria && tokenEmMemoria.expira > Date.now() + 60_000) return tokenEmMemoria.valor;

  const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? supabaseServico() : null;
  if (db) {
    const { data } = await db.from('tokens_lojas').select('access_token, expira_em').eq('loja', 'mercadolivre').maybeSingle();
    if (data && new Date(data.expira_em).getTime() > Date.now() + 60_000) {
      tokenEmMemoria = { valor: data.access_token, expira: new Date(data.expira_em).getTime() };
      return data.access_token;
    }
  }

  const res = await buscar(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
  });
  if (!res.ok) throw new Error(`Mercado Livre recusou o login da API (HTTP ${res.status})`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  const expira = Date.now() + json.expires_in * 1000;
  tokenEmMemoria = { valor: json.access_token, expira };
  if (db) {
    await db
      .from('tokens_lojas')
      .upsert({ loja: 'mercadolivre', access_token: json.access_token, expira_em: new Date(expira).toISOString() });
  }
  return json.access_token;
}

async function api<T>(caminho: string, token: string): Promise<T | 'nao-encontrado'> {
  const res = await buscar(`${API}${caminho}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  if (res.status === 404) return 'nao-encontrado';
  if (!res.ok) throw new Error(`API Mercado Livre: HTTP ${res.status}`);
  return (await res.json()) as T;
}

type ItemML = {
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  available_quantity?: number;
  thumbnail?: string;
  pictures?: { secure_url: string }[];
};
type ProdutoML = {
  name: string;
  status: string;
  pictures?: { url: string }[];
  buy_box_winner: { price: number; original_price: number | null } | null;
};

async function coletarPelaApi(lojaItemId: string, token: string): Promise<ResultadoColeta> {
  if (lojaItemId.startsWith('p/')) {
    const p = await api<ProdutoML>(`/products/${lojaItemId.slice(2)}`, token);
    if (p === 'nao-encontrado') return { preco: null, precoAntes: null, disponivel: false, fonte: 'API Mercado Livre' };
    const bb = p.buy_box_winner;
    return {
      preco: bb?.price ?? null,
      precoAntes: bb?.original_price ?? null,
      disponivel: p.status === 'active' && Boolean(bb),
      nome: p.name,
      foto: p.pictures?.[0]?.url ?? null,
      fonte: 'API Mercado Livre',
    };
  }
  const it = await api<ItemML>(`/items/${lojaItemId}`, token);
  if (it === 'nao-encontrado') return { preco: null, precoAntes: null, disponivel: false, fonte: 'API Mercado Livre' };
  return {
    preco: it.price,
    precoAntes: it.original_price,
    disponivel: it.status === 'active' && (it.available_quantity ?? 1) > 0,
    nome: it.title,
    foto: it.pictures?.[0]?.secure_url ?? it.thumbnail ?? null,
    fonte: 'API Mercado Livre',
  };
}

/** Lê "Agora: 65 reais com 45 centavos" do card do produto na página social. */
function valorAria(trecho: string, rotulo: 'Agora' | 'Antes'): number | null {
  const m = trecho.match(new RegExp(`aria-label="${rotulo}: ([\\d.]+) reais(?: com (\\d+) centavos?)?"`));
  if (!m) return null;
  const reais = parseNumero(m[1].replace(/\./g, '')) ?? 0;
  return reais + (m[2] ? Number(m[2]) / 100 : 0);
}

function coletarDaPagina(html: string, lojaItemId: string | null): ResultadoColeta | null {
  // 1) Página do produto com dados estruturados
  const d = lerDadosPagina(html);
  if (d.preco && /"@type"\s*:\s*"Product"|product:price/.test(html)) {
    return { preco: d.preco, precoAntes: d.precoAntes, disponivel: d.disponivel ?? true, nome: d.nome, foto: d.foto, fonte: 'página da loja' };
  }
  // 2) Página social do afiliado: o primeiro card é o produto do link
  const id = lojaItemId?.replace(/^p\//, '');
  if (!id) return null;
  const inicio = html.indexOf(id);
  if (inicio < 0) return null;
  const fim = html.indexOf('poly-card', inicio + 200);
  const trecho = html.slice(inicio, fim > 0 ? fim : inicio + 8000);
  const preco = valorAria(trecho, 'Agora');
  if (!preco) return null;
  return {
    preco,
    precoAntes: valorAria(trecho, 'Antes'),
    disponivel: true,
    nome: meta(html, 'og:title'),
    foto: meta(html, 'og:image'),
    fonte: 'página da loja',
  };
}

export const mercadoLivre: AdaptadorLoja = {
  loja: 'Mercado Livre',
  coletaAutomatica: true,

  reconhece: (s) => /mercado\s*livre|mercadolivre|mercadolibre|meli\.la/i.test(s),

  async identificar(link): Promise<Identificacao> {
    const direto = extrairIdMercadoLivre(link);
    if (direto) return { lojaItemId: direto, urlFinal: link };
    const { urlFinal, html } = await resolverLink(link);
    return { lojaItemId: extrairIdMercadoLivre(urlFinal, html), urlFinal, html };
  },

  async coletar({ link, lojaItemId }) {
    let erroApi: unknown = null;
    const token = await tokenMercadoLivre().catch((e) => {
      erroApi = e;
      return null;
    });
    if (token && lojaItemId) {
      try {
        const r = await coletarPelaApi(lojaItemId, token);
        if (r.preco != null || !r.disponivel) return r;
      } catch (e) {
        erroApi = e;
      }
    }
    const { html } = await resolverLink(link);
    const id = lojaItemId ?? extrairIdMercadoLivre(link, html);
    const r = coletarDaPagina(html, id);
    if (r) return r;
    throw new Error(
      erroApi instanceof Error
        ? `${erroApi.message}; e a página não trouxe o preço`
        : 'A página da loja não trouxe o preço (configure ML_CLIENT_ID e ML_CLIENT_SECRET)',
    );
  },
};

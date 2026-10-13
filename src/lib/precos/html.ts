import { parseNumero } from '@/lib/format';

export type DadosPagina = {
  nome: string | null;
  foto: string | null;
  preco: number | null;
  precoAntes: number | null;
  /** null = a página não informa. */
  disponivel: boolean | null;
};

const decodificar = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

export function meta(html: string, chave: string): string | null {
  const k = chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${k}["'][^>]*content=["']([^"']*)["']`, 'i'));
  const b = a ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name|itemprop)=["']${k}["']`, 'i'));
  return b ? decodificar(b[1]).trim() || null : null;
}

type JsonLd = Record<string, unknown>;

function blocosJsonLd(html: string): JsonLd[] {
  const out: JsonLd[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const v = JSON.parse(m[1].trim());
      const lista = Array.isArray(v) ? v : v['@graph'] ? v['@graph'] : [v];
      out.push(...lista.filter((x: unknown) => x && typeof x === 'object'));
    } catch {
      // bloco inválido: ignora
    }
  }
  return out;
}

const ehProduto = (b: JsonLd) => {
  const t = b['@type'];
  return t === 'Product' || (Array.isArray(t) && t.includes('Product'));
};

/** Lê preço e dados do produto pelo JSON-LD (offers.price) e pelas meta tags product:price. */
export function lerDadosPagina(html: string): DadosPagina {
  const dados: DadosPagina = { nome: null, foto: null, preco: null, precoAntes: null, disponivel: null };
  const produto = blocosJsonLd(html).find(ehProduto);

  if (produto) {
    dados.nome = typeof produto.name === 'string' ? produto.name : null;
    const img = produto.image;
    dados.foto = typeof img === 'string' ? img : Array.isArray(img) && typeof img[0] === 'string' ? img[0] : null;
    const offersRaw = produto.offers as JsonLd | JsonLd[] | undefined;
    const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw;
    if (offer) {
      dados.preco = parseNumero(offer.price ?? offer.lowPrice);
      const alto = parseNumero(offer.highPrice);
      if (alto && dados.preco && alto > dados.preco && offer['@type'] !== 'AggregateOffer') dados.precoAntes = alto;
      const disp = String(offer.availability ?? '');
      if (disp) dados.disponivel = !/OutOfStock|SoldOut|Discontinued/i.test(disp);
    }
  }

  dados.nome ??= meta(html, 'og:title');
  dados.foto ??= meta(html, 'og:image');
  dados.preco ??= parseNumero(meta(html, 'product:price:amount') ?? meta(html, 'og:price:amount') ?? meta(html, 'price'));
  if (dados.disponivel === null) {
    const d = meta(html, 'product:availability') ?? meta(html, 'og:availability');
    if (d) dados.disponivel = !/out ?of ?stock|oos|esgotado/i.test(d);
  }
  return dados;
}

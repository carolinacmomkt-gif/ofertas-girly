import { LinkQuebradoError } from './tipos';

export const USER_AGENT =
  'Mozilla/5.0 (compatible; AchadinhosPrecos/1.0; +' + (process.env.NEXT_PUBLIC_SITE_URL || 'https://netlify.app') + ')';

export async function buscar(url: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const { timeoutMs = 8_000, ...resto } = init;
  return fetch(url, {
    redirect: 'follow',
    cache: 'no-store',
    ...resto,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'pt-BR,pt;q=0.9',
      ...(resto.headers || {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/** Segue os redirecionamentos e devolve a URL final e o HTML da página. */
export async function resolverLink(link: string): Promise<{ urlFinal: string; html: string }> {
  const res = await buscar(link, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (res.status === 404 || res.status === 410) throw new LinkQuebradoError(`Link quebrado (HTTP ${res.status})`);
  const html = res.ok ? await res.text() : '';
  return { urlFinal: res.url || link, html };
}

/** Executa fn com novas tentativas e espera crescente (1 s, 2 s, 4 s...). */
export async function comTentativas<T>(fn: () => Promise<T>, tentativas = 3, baseMs = 1000): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof LinkQuebradoError) throw e;
      ultimoErro = e;
      if (i < tentativas - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw ultimoErro;
}

export function decodificarUrl(url: string): string {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

import { decodificarUrl, resolverLink } from './http';
import type { AdaptadorLoja, Identificacao } from './tipos';

/*
 * A Shopee não tem API pública de preço para este uso, e a página do produto só
 * mostra nome, foto e preço depois de rodar JavaScript. Por isso o adaptador só
 * identifica o produto pelo link; preço, nome e foto são preenchidos no painel.
 *
 * ID guardado em produtos.loja_item_id: "{shopid}.{itemid}"
 */

export function extrairIdShopee(url: string): string | null {
  const u = decodificarUrl(url);
  const caminho = u.match(/shopee\.com\.br\/(?:[^/?#]+\/){0,2}(\d{3,})\/(\d{3,})/i);
  if (caminho) return `${caminho[1]}.${caminho[2]}`;
  const nome = u.match(/-i\.(\d{3,})\.(\d{3,})/);
  if (nome) return `${nome[1]}.${nome[2]}`;
  const shop = u.match(/[?&]shopid=(\d+)/i);
  const item = u.match(/[?&]itemid=(\d+)/i);
  if (shop && item) return `${shop[1]}.${item[1]}`;
  return null;
}

export const shopee: AdaptadorLoja = {
  loja: 'Shopee',
  coletaAutomatica: false,

  reconhece: (s) => /shopee|shope\.ee/i.test(s),

  async identificar(link): Promise<Identificacao> {
    const direto = extrairIdShopee(link);
    if (direto) return { lojaItemId: direto, urlFinal: link };
    const { urlFinal } = await resolverLink(link);
    return { lojaItemId: extrairIdShopee(urlFinal), urlFinal };
  },

  async coletar() {
    throw new Error('A Shopee não informa o preço automaticamente. Atualize o preço no painel.');
  },
};

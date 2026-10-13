export type ResultadoColeta = {
  preco: number | null;
  precoAntes: number | null;
  /** false = a loja informou que o produto acabou ou o link quebrou. */
  disponivel: boolean;
  nome?: string | null;
  foto?: string | null;
  /** De onde veio o preço (API, página etc.), para o painel. */
  fonte: string;
};

export type Identificacao = {
  lojaItemId: string | null;
  urlFinal: string;
  html?: string;
};

export interface AdaptadorLoja {
  loja: string;
  /** false = a loja não informa o preço; o preço é digitado no painel. */
  coletaAutomatica: boolean;
  /** Diz se este adaptador cuida deste link ou nome de loja. */
  reconhece(linkOuLoja: string): boolean;
  /** Resolve o link curto de afiliada e extrai o ID do produto na loja. */
  identificar(link: string): Promise<Identificacao>;
  /** Busca preço, preço antigo e disponibilidade (só se coletaAutomatica). */
  coletar(args: { link: string; lojaItemId: string | null }): Promise<ResultadoColeta>;
}

export class LinkQuebradoError extends Error {}

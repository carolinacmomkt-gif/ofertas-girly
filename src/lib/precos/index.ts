import { mercadoLivre } from './mercadolivre';
import { shopee } from './shopee';
import type { AdaptadorLoja } from './tipos';

/** Para adicionar Amazon ou Magalu: crie lib/precos/amazon.ts e inclua aqui. */
export const ADAPTADORES: AdaptadorLoja[] = [mercadoLivre, shopee];

export function adaptadorPara(link: string, loja?: string | null): AdaptadorLoja | null {
  return ADAPTADORES.find((a) => a.reconhece(link)) ?? (loja ? ADAPTADORES.find((a) => a.reconhece(loja)) : undefined) ?? null;
}

export type { AdaptadorLoja, ResultadoColeta } from './tipos';

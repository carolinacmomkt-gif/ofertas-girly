'use client';

import { FotoProduto } from '@/components/FotoProduto';
import { brl, precoVencido, tempoDesde } from '@/lib/format';
import type { ProdutoPublico } from '@/lib/types';

function registrarClique(id: string) {
  try {
    const corpo = JSON.stringify({ id });
    if (!navigator.sendBeacon?.('/api/clique', new Blob([corpo], { type: 'application/json' }))) {
      void fetch('/api/clique', { method: 'POST', body: corpo, keepalive: true });
    }
  } catch {
    // contagem é secundária: nunca impede a compra
  }
}

type Props = {
  produto: ProdutoPublico;
  agora: number;
  /** Prioriza o carregamento das primeiras fotos (LCP). */
  prioridade?: boolean;
  /** No painel, a prévia não registra cliques. */
  previa?: boolean;
};

export function CardProduto({ produto: p, agora, prioridade, previa }: Props) {
  const vencido = precoVencido(p, agora);
  const loja = p.loja || 'Loja';

  return (
    <article className="relative flex flex-col overflow-hidden rounded-card border border-borda bg-card shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-rosa-500 focus-within:border-rosa-500">
      <div className="relative flex aspect-square items-center justify-center bg-white">
        {p.foto_url ? (
          <FotoProduto src={p.foto_url} alt={p.nome} sizes="(max-width: 480px) 50vw, (max-width: 720px) 33vw, 240px" prioridade={prioridade} />
        ) : (
          <span className="p-3 text-center text-xs text-suave">Foto do produto</span>
        )}
        {!vencido && p.desconto ? (
          <span className="rose absolute top-2.5 left-2.5 rounded-full px-2.5 pt-1 pb-1.5 font-display text-[19px] leading-none font-extrabold">
            -{p.desconto}%
          </span>
        ) : null}
        <span className="absolute right-2.5 bottom-2.5 max-w-[calc(100%-20px)] rounded-full border border-borda bg-white/95 px-2.5 py-1.5 text-[11px] leading-tight font-extrabold text-texto">
          <span className="text-rosa-700" aria-hidden>
            ✓
          </span>{' '}
          Vendido no {loja}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="text-sm leading-snug font-bold">{p.nome}</h3>
        {p.descricao ? <p className="line-clamp-3 text-xs leading-relaxed text-suave">{p.descricao}</p> : null}

        {vencido ? (
          <p className="mt-1 font-display text-[22px] leading-tight font-semibold text-rosa-700">Ver preço na loja</p>
        ) : (
          <>
            {p.preco_antes ? (
              <span className="text-xs text-suave">
                de <s>{brl(p.preco_antes)}</s>
              </span>
            ) : null}
            <span className="texto-rose font-display text-[25px] leading-tight font-extrabold whitespace-nowrap sm:text-[30px]">{brl(p.preco!)}</span>
            {p.preco_atualizado_em && !p.preco_manual ? (
              <span className="text-[11px] text-suave">Preço atualizado {tempoDesde(p.preco_atualizado_em, agora)}</span>
            ) : null}
          </>
        )}

        <a
          href={p.link}
          target="_blank"
          rel="noopener sponsored"
          onClick={previa ? (e) => e.preventDefault() : () => registrarClique(p.id)}
          className="rose mt-auto flex items-center justify-center rounded-full p-3 text-sm font-extrabold transition hover:brightness-105"
          aria-label={`Comprar ${p.nome} no ${loja} (abre em nova aba)`}
        >
          Comprar
        </a>
      </div>
    </article>
  );
}

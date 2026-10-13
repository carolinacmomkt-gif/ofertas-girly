'use client';

import { useMemo, useState } from 'react';
import type { Categoria, ProdutoPublico } from '@/lib/types';
import { CardProduto } from './CardProduto';

const TODOS = 'todos';
const OUTROS: Categoria = { id: 'outros', nome: 'Outros', slug: 'outros', ordem: 9999, ativa: true };

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

type Props = {
  categorias: Categoria[];
  produtos: ProdutoPublico[];
  categoriaInicial?: string;
  /** Hora da renderização no servidor: evita diferença de hidratação no "há X h". */
  agora: number;
};

export function Catalogo({ categorias, produtos, categoriaInicial = TODOS, agora }: Props) {
  const [categoria, setCategoria] = useState(categoriaInicial);
  const [busca, setBusca] = useState('');

  const todas = useMemo(() => {
    const comOutros = produtos.some((p) => !p.categoria_id) ? [...categorias, OUTROS] : categorias;
    return comOutros
      .map((c) => ({ ...c, itens: produtos.filter((p) => (p.categoria_id ?? 'outros') === c.id) }))
      .filter((c) => c.itens.length > 0);
  }, [categorias, produtos]);

  const termo = normalizar(busca.trim());
  const filtra = (p: ProdutoPublico) => !termo || normalizar(`${p.nome} ${p.descricao ?? ''}`).includes(termo);

  const visiveis = (categoria === TODOS ? todas : todas.filter((c) => c.slug === categoria))
    .map((c) => ({ ...c, itens: c.itens.filter(filtra) }))
    .filter((c) => c.itens.length > 0);

  const destaques = categoria === TODOS && !termo ? produtos.filter((p) => p.destaque) : [];
  const vazio = visiveis.length === 0;

  function escolher(slug: string) {
    setCategoria(slug);
    // URL própria por categoria, sem recarregar a página.
    window.history.replaceState(null, '', slug === TODOS ? '/' : `/categoria/${slug}`);
    document.getElementById('lista')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // As 2 primeiras fotos carregam na hora (LCP); o resto, sob demanda.
  let fotos = 0;
  const prioridade = () => fotos++ < 2;

  return (
    <>
      <label htmlFor="busca" className="sr-only">
        Buscar produto
      </label>
      <input
        id="busca"
        type="search"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar um achadinho"
        autoComplete="off"
        className="mb-3 w-full rounded-full border border-borda bg-card shadow-card px-[18px] py-3.5 text-texto outline-none placeholder:text-suave focus:border-rosa-500"
      />

      <nav
        aria-label="Categorias"
        className="sem-scrollbar sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto bg-fundo px-4 py-3"
      >
        {[{ slug: TODOS, nome: 'Todos', total: produtos.length }, ...todas.map((c) => ({ slug: c.slug, nome: c.nome, total: c.itens.length }))].map(
          (c) => {
            const ativo = c.slug === categoria;
            return (
              <button
                key={c.slug}
                type="button"
                onClick={() => escolher(c.slug)}
                aria-pressed={ativo}
                className={`flex-none cursor-pointer rounded-full border-[1.5px] px-4 py-2.5 text-[13px] font-extrabold whitespace-nowrap transition ${
                  ativo ? 'rose border-transparent' : 'border-borda bg-elevado hover:border-rosa-500'
                }`}
              >
                {c.nome}
                <span className={`ml-1.5 font-semibold ${ativo ? '' : 'text-suave'}`}>{c.total}</span>
              </button>
            );
          },
        )}
      </nav>

      <main id="lista" className="scroll-mt-16">
        {destaques.length > 0 && (
          <Secao titulo="Destaques" icone="♡" total={destaques.length}>
            {destaques.map((p) => (
              <CardProduto key={p.id} produto={p} agora={agora} prioridade={prioridade()} />
            ))}
          </Secao>
        )}

        {visiveis.map((c) => (
          <Secao key={c.id} titulo={c.nome} total={c.itens.length}>
            {c.itens.map((p) => (
              <CardProduto key={p.id} produto={p} agora={agora} prioridade={prioridade()} />
            ))}
          </Secao>
        ))}

        {vazio && (
          <p className="py-10 text-center text-suave" role="status">
            {termo ? `Não achei nada para "${busca.trim()}". Que tal outra palavra?` : 'Ainda não tem achadinhos por aqui. Volta logo, tá?'}
          </p>
        )}
      </main>
    </>
  );
}

function Secao({ titulo, icone, total, children }: { titulo: string; icone?: string; total: number; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-baseline justify-between font-display text-[28px] font-semibold italic">
        <span>
          {icone ? (
            <span className="mr-2 text-rosa-700" aria-hidden>
              {icone}
            </span>
          ) : null}
          {titulo}
        </span>
        <span className="font-sans text-xs font-semibold not-italic text-suave">
          {total} {total > 1 ? 'produtos' : 'produto'}
        </span>
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </section>
  );
}

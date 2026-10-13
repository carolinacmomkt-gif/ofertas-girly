import 'server-only';
import { supabasePublico } from '@/lib/supabase/server';
import type { Categoria, ProdutoPublico } from '@/lib/types';

const CAMPOS_PUBLICOS =
  'id, nome, descricao, categoria_id, preco, preco_antes, desconto, loja, link, foto_url, destaque, ordem, preco_atualizado_em, preco_manual';

export type Catalogo = { categorias: Categoria[]; produtos: ProdutoPublico[] };

/** Lê o catálogo com a chave anônima: o RLS só devolve o que é público. */
export async function carregarCatalogo(): Promise<Catalogo> {
  const db = supabasePublico();
  const [cats, prods] = await Promise.all([
    db.from('categorias').select('id, nome, slug, ordem, ativa').eq('ativa', true).order('ordem'),
    db.from('produtos').select(CAMPOS_PUBLICOS).eq('ativo', true).eq('disponivel', true).order('ordem'),
  ]);
  if (cats.error) throw new Error(cats.error.message);
  if (prods.error) throw new Error(prods.error.message);

  const ativas = new Set(cats.data.map((c) => c.id));
  // Produto de categoria oculta não aparece. Sem categoria vai para "Outros".
  const produtos = (prods.data as ProdutoPublico[]).filter((p) => !p.categoria_id || ativas.has(p.categoria_id));
  return { categorias: cats.data as Categoria[], produtos };
}

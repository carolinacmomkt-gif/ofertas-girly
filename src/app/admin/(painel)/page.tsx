import { ListaProdutos } from '@/components/admin/ListaProdutos';
import { exigirAdmin } from '@/lib/admin';
import type { Categoria, Coleta, Produto } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PainelProdutos() {
  const { supabase } = await exigirAdmin();
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [produtos, categorias, cliques, historico, coleta] = await Promise.all([
    supabase.from('produtos').select('*').order('ordem'),
    supabase.from('categorias').select('*').order('ordem'),
    supabase.from('cliques_por_produto').select('*'),
    supabase.from('historico_precos').select('produto_id, preco, coletado_em').gte('coletado_em', desde).order('coletado_em').limit(5000),
    supabase.from('coletas').select('*').order('iniciada_em', { ascending: false }).limit(1).maybeSingle(),
  ]);

  const erro = produtos.error ?? categorias.error;
  if (erro) {
    return (
      <p role="alert" className="text-suave">
        Não deu para carregar os produtos: {erro.message}
      </p>
    );
  }

  const historicoPorProduto: Record<string, { preco: number; coletado_em: string }[]> = {};
  for (const h of historico.data ?? []) (historicoPorProduto[h.produto_id] ??= []).push({ preco: Number(h.preco), coletado_em: h.coletado_em });

  const cliquesPorProduto: Record<string, { total: number; ultimos_7_dias: number }> = {};
  for (const c of cliques.data ?? []) cliquesPorProduto[c.produto_id] = c;

  return (
    <ListaProdutos
      produtos={produtos.data as Produto[]}
      categorias={categorias.data as Categoria[]}
      cliques={cliquesPorProduto}
      historico={historicoPorProduto}
      ultimaColeta={(coleta.data as Coleta | null) ?? null}
      agora={Date.now()}
    />
  );
}

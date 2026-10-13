import { notFound } from 'next/navigation';
import { FormProduto } from '@/components/admin/FormProduto';
import { Titulo } from '@/components/admin/ui';
import { exigirAdmin } from '@/lib/admin';
import type { Categoria, Produto } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function EditarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await exigirAdmin();
  const desde = new Date(Date.now() - 30 * 86400_000).toISOString();
  const [produto, categorias, historico] = await Promise.all([
    supabase.from('produtos').select('*').eq('id', id).maybeSingle(),
    supabase.from('categorias').select('*').order('ordem'),
    supabase.from('historico_precos').select('preco, coletado_em').eq('produto_id', id).gte('coletado_em', desde).order('coletado_em'),
  ]);
  if (!produto.data) notFound();
  return (
    <>
      <Titulo>Editar produto</Titulo>
      <FormProduto
        produto={produto.data as Produto}
        categorias={(categorias.data ?? []) as Categoria[]}
        historico={(historico.data ?? []).map((h) => ({ preco: Number(h.preco), coletado_em: h.coletado_em }))}
        agora={Date.now()}
      />
    </>
  );
}

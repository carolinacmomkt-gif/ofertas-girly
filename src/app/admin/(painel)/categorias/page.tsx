import { GerenciarCategorias } from '@/components/admin/GerenciarCategorias';
import { Titulo } from '@/components/admin/ui';
import { exigirAdmin } from '@/lib/admin';
import type { Categoria } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Categorias() {
  const { supabase } = await exigirAdmin();
  const [cats, prods] = await Promise.all([
    supabase.from('categorias').select('*').order('ordem'),
    supabase.from('produtos').select('categoria_id'),
  ]);
  const contagem: Record<string, number> = {};
  for (const p of prods.data ?? []) if (p.categoria_id) contagem[p.categoria_id] = (contagem[p.categoria_id] ?? 0) + 1;
  return (
    <>
      <Titulo>Categorias</Titulo>
      <GerenciarCategorias categorias={(cats.data ?? []) as Categoria[]} contagem={contagem} />
    </>
  );
}

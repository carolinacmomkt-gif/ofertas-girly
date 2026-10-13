import { FormProduto } from '@/components/admin/FormProduto';
import { Titulo } from '@/components/admin/ui';
import { exigirAdmin } from '@/lib/admin';
import type { Categoria } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function NovoProduto() {
  const { supabase } = await exigirAdmin();
  const { data } = await supabase.from('categorias').select('*').order('ordem');
  return (
    <>
      <Titulo>Novo produto</Titulo>
      <FormProduto categorias={(data ?? []) as Categoria[]} agora={Date.now()} />
    </>
  );
}

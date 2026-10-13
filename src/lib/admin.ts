import 'server-only';
import { redirect } from 'next/navigation';
import { supabaseSessao } from '@/lib/supabase/server';

/** Garante que quem chama é um administrador. Para páginas: redireciona. */
export async function exigirAdmin() {
  const supabase = await supabaseSessao();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: ehAdmin } = await supabase.rpc('is_admin');
  if (!ehAdmin) redirect('/admin/login?erro=sem-permissao');
  return { supabase, user };
}

/** Para rotas de API e server actions: devolve null se não for admin. */
export async function adminOuNulo() {
  const supabase = await supabaseSessao();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: ehAdmin } = await supabase.rpc('is_admin');
  return ehAdmin ? { supabase, user } : null;
}

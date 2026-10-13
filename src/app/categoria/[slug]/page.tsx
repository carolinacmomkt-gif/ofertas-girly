import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PaginaCatalogo } from '@/components/public/PaginaCatalogo';
import { PERFIL } from '@/lib/format';
import { supabaseConfigurado } from '@/lib/supabase/env';
import { supabasePublico } from '@/lib/supabase/server';

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

async function buscarCategoria(slug: string) {
  if (!supabaseConfigurado()) return null;
  const { data } = await supabasePublico().from('categorias').select('nome, slug').eq('slug', slug).eq('ativa', true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cat = await buscarCategoria(slug);
  if (!cat) return {};
  const titulo = `Achadinhos de ${cat.nome}`;
  const descricao = `Os melhores achadinhos de ${cat.nome.toLowerCase()} com desconto, direto do site das lojas. ${PERFIL.handle}`;
  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: `/categoria/${cat.slug}` },
    openGraph: { title: `${titulo} · ${PERFIL.handle}`, description: descricao, url: `/categoria/${cat.slug}` },
  };
}

export default async function PaginaCategoria({ params }: Params) {
  const { slug } = await params;
  const cat = await buscarCategoria(slug);
  if (!cat) notFound();
  return <PaginaCatalogo categoria={cat.slug} />;
}

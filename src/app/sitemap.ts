import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/format';
import { supabaseConfigurado } from '@/lib/supabase/env';
import { supabasePublico } from '@/lib/supabase/server';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const paginas: MetadataRoute.Sitemap = [{ url: base, changeFrequency: 'hourly', priority: 1 }];
  if (!supabaseConfigurado()) return paginas;
  const { data } = await supabasePublico().from('categorias').select('slug').eq('ativa', true).order('ordem');
  return [...paginas, ...(data ?? []).map((c) => ({ url: `${base}/categoria/${c.slug}`, changeFrequency: 'hourly' as const, priority: 0.8 }))];
}

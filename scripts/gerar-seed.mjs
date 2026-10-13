// Gera supabase/seed.sql a partir de data/produtos-iniciais.json.
// Uso: npm run seed:gerar
import { readFileSync, writeFileSync } from 'node:fs';

const ADMINS = ['carolinacmomkt@gmail.com'];
const CATEGORIAS = ['Beleza', 'Skincare', 'Moda', 'Acessórios', 'Casa', 'Papelaria'];
const produtos = JSON.parse(readFileSync(new URL('../data/produtos-iniciais.json', import.meta.url), 'utf8'));

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const txt = (v) => (v == null || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const num = (v) => (v == null || v === '' ? 'null' : String(Number(v)));

const linhas = [];
linhas.push('-- Gerado por scripts/gerar-seed.mjs. Rode depois de 0001_schema.sql.');
linhas.push('begin;');
linhas.push(`insert into public.admins (email) values ${ADMINS.map((e) => `(${txt(e.toLowerCase())})`).join(', ')} on conflict do nothing;`);
linhas.push('');
linhas.push('insert into public.categorias (nome, slug, ordem) values');
linhas.push(CATEGORIAS.map((c, i) => `  (${txt(c)}, ${txt(slug(c))}, ${i + 1})`).join(',\n'));
linhas.push('on conflict (slug) do nothing;');
linhas.push('');

const ordemPorCategoria = {};
const valores = produtos.map((p) => {
  const ordem = (ordemPorCategoria[p.categoria] = (ordemPorCategoria[p.categoria] ?? 0) + 1);
  return `  (${txt(p.nome)}, ${txt(p.descricao)}, ${txt(slug(p.categoria))}, ${num(p.preco)}, ${num(p.preco_antes)}, ${num(p.desconto)}, ${txt(p.loja)}, ${txt(p.link)}, ${txt(p.foto_url)}, ${ordem}, ${p.ativo === false ? 'false' : 'true'})`;
});

linhas.push('insert into public.produtos (nome, descricao, categoria_id, preco, preco_antes, desconto, loja, link, foto_url, ordem, ativo, preco_manual, preco_atualizado_em)');
linhas.push('select v.nome, v.descricao::text, c.id, v.preco::numeric, v.preco_antes::numeric, v.desconto::int, v.loja, v.link, v.foto_url::text, v.ordem, v.ativo, v.loja ilike \'shopee\', now()');
linhas.push('from (values');
linhas.push(valores.join(',\n'));
linhas.push(') as v(nome, descricao, categoria_slug, preco, preco_antes, desconto, loja, link, foto_url, ordem, ativo)');
linhas.push('join public.categorias c on c.slug = v.categoria_slug');
linhas.push('where not exists (select 1 from public.produtos p where p.link = v.link);');
linhas.push('commit;');

// Produtos com "ativo": false entram ocultos (para completar no painel antes de aparecer).
// Shopee não informa o preço automaticamente: esses produtos ficam com preço manual.
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), linhas.join('\n') + '\n');
console.log(`seed.sql gerado com ${produtos.length} produtos e ${CATEGORIAS.length} categorias.`);

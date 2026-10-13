'use server';

import { revalidatePath } from 'next/cache';
import { adminOuNulo } from '@/lib/admin';
import { lerCsv } from '@/lib/csv';
import { calcularDesconto, precoAutomatico, slugify } from '@/lib/format';
import { adaptadorPara } from '@/lib/precos';

export type Resposta<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

type Db = NonNullable<Awaited<ReturnType<typeof adminOuNulo>>>['supabase'];

async function admin(): Promise<Db> {
  const a = await adminOuNulo();
  if (!a) throw new Error('Sua sessão expirou. Entre de novo.');
  return a.supabase;
}

function atualizarPaginaPublica() {
  revalidatePath('/', 'layout');
}

async function executar<T>(fn: (db: Db) => Promise<T>): Promise<Resposta<T>> {
  try {
    const db = await admin();
    const dados = await fn(db);
    atualizarPaginaPublica();
    return { ok: true, dados };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : 'Algo deu errado. Tente de novo.' };
  }
}

const falhou = (error: { message: string; code?: string } | null) => {
  if (!error) return;
  if (error.code === '23505') throw new Error('Já existe um item com esse nome.');
  throw new Error(error.message);
};

// ---------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------
async function obterOuCriarCategoria(db: Db, nome: string): Promise<string> {
  const limpo = nome.trim();
  const slug = slugify(limpo);
  if (!slug) throw new Error('Nome de categoria inválido.');
  const { data: existente } = await db.from('categorias').select('id').eq('slug', slug).maybeSingle();
  if (existente) return existente.id;
  const { data: ultima } = await db.from('categorias').select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db
    .from('categorias')
    .insert({ nome: limpo, slug, ordem: (ultima?.ordem ?? 0) + 1 })
    .select('id')
    .single();
  falhou(error);
  return data!.id;
}

export async function criarCategoria(nome: string) {
  return executar((db) => obterOuCriarCategoria(db, nome));
}

export async function renomearCategoria(id: string, nome: string) {
  return executar(async (db) => {
    if (!nome.trim()) throw new Error('Digite um nome.');
    const { error } = await db.from('categorias').update({ nome: nome.trim(), slug: slugify(nome) }).eq('id', id);
    falhou(error);
  });
}

export async function alternarCategoria(id: string, ativa: boolean) {
  return executar(async (db) => {
    const { error } = await db.from('categorias').update({ ativa }).eq('id', id);
    falhou(error);
  });
}

export async function reordenarCategorias(ids: string[]) {
  return executar(async (db) => {
    const res = await Promise.all(ids.map((id, i) => db.from('categorias').update({ ordem: i + 1 }).eq('id', id)));
    falhou(res.find((r) => r.error)?.error ?? null);
  });
}

export async function excluirCategoria(id: string) {
  return executar(async (db) => {
    const { count } = await db.from('produtos').select('id', { count: 'exact', head: true }).eq('categoria_id', id);
    if (count) throw new Error(`Esta categoria tem ${count} produto(s). Mova-os ou oculte a categoria.`);
    const { error } = await db.from('categorias').delete().eq('id', id);
    falhou(error);
  });
}

// ---------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------
export type DadosProduto = {
  id?: string;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  nova_categoria?: string | null;
  loja: string;
  preco: number | null;
  preco_antes: number | null;
  desconto: number | null;
  link: string;
  foto_url: string | null;
  loja_item_id?: string | null;
  destaque: boolean;
  ativo: boolean;
  preco_manual: boolean;
};

export async function salvarProduto(d: DadosProduto) {
  return executar(async (db) => {
    if (!d.nome.trim()) throw new Error('Digite o nome do produto.');
    if (!/^https?:\/\//i.test(d.link.trim())) throw new Error('O link precisa começar com https://');
    if (d.preco != null && d.preco < 0) throw new Error('Preço inválido.');

    const categoria_id = d.nova_categoria?.trim() ? await obterOuCriarCategoria(db, d.nova_categoria) : d.categoria_id;
    const desconto = calcularDesconto(d.preco, d.preco_antes) ?? (d.desconto ? Math.min(99, Math.max(0, Math.round(d.desconto))) : null);
    const link = d.link.trim();

    let loja_item_id = d.loja_item_id ?? null;
    let linkMudou = !d.id;
    if (d.id) {
      const { data: atual } = await db.from('produtos').select('link, loja_item_id').eq('id', d.id).single();
      linkMudou = atual?.link !== link;
      if (!linkMudou && !loja_item_id) loja_item_id = atual?.loja_item_id ?? null;
    }
    // Identifica o produto na loja pelo link (o link de afiliada continua no botão Comprar).
    if (linkMudou && !loja_item_id) {
      const adaptador = adaptadorPara(link, d.loja);
      loja_item_id = adaptador ? await adaptador.identificar(link).then((r) => r.lojaItemId).catch(() => null) : null;
    }

    const registro = {
      nome: d.nome.trim(),
      descricao: d.descricao?.trim() || null,
      categoria_id,
      loja: d.loja.trim() || 'Loja',
      preco: d.preco,
      preco_antes: d.preco_antes && d.preco && d.preco_antes > d.preco ? d.preco_antes : null,
      desconto,
      link,
      loja_item_id,
      foto_url: d.foto_url || null,
      destaque: d.destaque,
      ativo: d.ativo,
      // Loja sem coleta automática (Shopee): o preço digitado vale sempre.
      preco_manual: precoAutomatico(link, d.loja) ? d.preco_manual : true,
    };

    if (d.id) {
      const { data: antes } = await db.from('produtos').select('preco, preco_antes').eq('id', d.id).single();
      const precoMudou = antes?.preco !== registro.preco || antes?.preco_antes !== registro.preco_antes;
      const { error } = await db
        .from('produtos')
        .update({
          ...registro,
          ...(precoMudou ? { preco_atualizado_em: new Date().toISOString() } : {}),
          ...(linkMudou ? { disponivel: true, alerta: null, ultimo_erro: null } : {}),
        })
        .eq('id', d.id);
      falhou(error);
      if (precoMudou && registro.preco != null) {
        await db.from('historico_precos').insert({ produto_id: d.id, preco: registro.preco, preco_antes: registro.preco_antes });
      }
      return d.id;
    }

    const { data: primeiro } = await db.from('produtos').select('ordem').order('ordem').limit(1).maybeSingle();
    const { data, error } = await db
      .from('produtos')
      .insert({ ...registro, ordem: (primeiro?.ordem ?? 1) - 1, preco_atualizado_em: registro.preco != null ? new Date().toISOString() : null })
      .select('id')
      .single();
    falhou(error);
    if (registro.preco != null) {
      await db.from('historico_precos').insert({ produto_id: data!.id, preco: registro.preco, preco_antes: registro.preco_antes });
    }
    return data!.id as string;
  });
}

export async function excluirProduto(id: string) {
  return executar(async (db) => {
    const { error } = await db.from('produtos').delete().eq('id', id);
    falhou(error);
  });
}

export async function alternarCampo(id: string, campo: 'ativo' | 'destaque' | 'preco_manual', valor: boolean) {
  return executar(async (db) => {
    const { error } = await db
      .from('produtos')
      .update({ [campo]: valor })
      .eq('id', id);
    falhou(error);
  });
}

/** Limpa o alerta. Com reexibir, o produto indisponível volta para a página pública. */
export async function dispensarAlerta(id: string, reexibir = false) {
  return executar(async (db) => {
    const { error } = await db
      .from('produtos')
      .update(reexibir ? { alerta: null, disponivel: true } : { alerta: null })
      .eq('id', id);
    falhou(error);
  });
}

export async function reordenarProdutos(ids: string[]) {
  return executar(async (db) => {
    const res = await Promise.all(ids.map((id, i) => db.from('produtos').update({ ordem: i + 1 }).eq('id', id)));
    falhou(res.find((r) => r.error)?.error ?? null);
  });
}

// ---------------------------------------------------------------------
// Importação de CSV (atualiza pelo link, cria os que não existem)
// ---------------------------------------------------------------------
export async function importarCsv(texto: string) {
  return executar(async (db) => {
    const { linhas, erros } = lerCsv(texto);
    if (!linhas.length) throw new Error(erros[0] ?? 'Nenhum produto válido no arquivo.');

    const categorias = new Map<string, string>();
    for (const nome of new Set(linhas.map((l) => l.categoria))) categorias.set(nome, await obterOuCriarCategoria(db, nome));

    const { data: existentes } = await db.from('produtos').select('id, link');
    const porLink = new Map((existentes ?? []).map((p) => [p.link, p.id]));
    const agora = new Date().toISOString();

    let criados = 0;
    let atualizados = 0;
    for (const [i, l] of linhas.entries()) {
      const registro = {
        nome: l.nome,
        descricao: l.descricao,
        categoria_id: categorias.get(l.categoria)!,
        preco: l.preco,
        preco_antes: l.preco_antes,
        desconto: calcularDesconto(l.preco, l.preco_antes) ?? l.desconto,
        loja: l.loja,
        link: l.link,
        foto_url: l.foto_url,
        destaque: l.destaque,
        ativo: l.ativo,
        ordem: i + 1,
        ...(precoAutomatico(l.link, l.loja) ? {} : { preco_manual: true }),
        preco_atualizado_em: l.preco != null ? agora : null,
      };
      const id = porLink.get(l.link);
      const { error } = id
        ? await db.from('produtos').update(registro).eq('id', id)
        : await db.from('produtos').insert(registro);
      if (error) erros.push(`${l.nome}: ${error.message}`);
      else if (id) atualizados++;
      else criados++;
    }
    return { criados, atualizados, erros };
  });
}

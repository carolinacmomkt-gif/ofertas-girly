import 'server-only';
import { revalidatePath } from 'next/cache';
import { calcularDesconto } from '@/lib/format';
import { supabaseServico } from '@/lib/supabase/server';
import type { Produto } from '@/lib/types';
import { comTentativas } from './http';
import { adaptadorPara } from './index';
import { LinkQuebradoError } from './tipos';

const TAMANHO_LOTE = 5;

export const ALERTA_INDISPONIVEL = 'Indisponível na loja';
export const ALERTA_LINK_QUEBRADO = 'Link quebrado';

type ResultadoProduto = { status: 'atualizado' | 'falha' | 'ignorado'; erro?: string };

type ProdutoColeta = Pick<
  Produto,
  'id' | 'nome' | 'link' | 'loja' | 'loja_item_id' | 'preco' | 'preco_antes' | 'desconto' | 'preco_manual' | 'alerta'
>;

const CAMPOS = 'id, nome, link, loja, loja_item_id, preco, preco_antes, desconto, preco_manual, alerta';

async function atualizarUm(p: ProdutoColeta): Promise<ResultadoProduto> {
  const db = supabaseServico();
  const agora = new Date().toISOString();
  const adaptador = adaptadorPara(p.link, p.loja);
  if (!adaptador?.coletaAutomatica) return { status: 'ignorado' };

  try {
    let lojaItemId = p.loja_item_id;
    if (!lojaItemId) {
      lojaItemId = (await comTentativas(() => adaptador.identificar(p.link), 2)).lojaItemId;
      if (lojaItemId) await db.from('produtos').update({ loja_item_id: lojaItemId }).eq('id', p.id);
    }

    const r = await comTentativas(() => adaptador.coletar({ link: p.link, lojaItemId }), 2);

    if (!r.disponivel) {
      await db
        .from('produtos')
        .update({ disponivel: false, alerta: ALERTA_INDISPONIVEL, ultima_coleta_em: agora, ultimo_erro: null })
        .eq('id', p.id);
      return { status: 'atualizado' };
    }

    // Voltou a ficar disponível: limpa os alertas de indisponibilidade.
    const alertaAnterior = p.alerta === ALERTA_INDISPONIVEL || p.alerta === ALERTA_LINK_QUEBRADO ? null : p.alerta;

    if (p.preco_manual || r.preco == null) {
      await db
        .from('produtos')
        .update({
          disponivel: true,
          alerta: alertaAnterior,
          ultima_coleta_em: agora,
          ultimo_erro: r.preco == null && !p.preco_manual ? 'A loja não informou o preço' : null,
        })
        .eq('id', p.id);
      return r.preco == null && !p.preco_manual ? { status: 'falha', erro: 'A loja não informou o preço' } : { status: 'atualizado' };
    }

    const precoAntes = r.precoAntes && r.precoAntes > r.preco ? r.precoAntes : null;
    const desconto = calcularDesconto(r.preco, precoAntes);

    let alerta = alertaAnterior;
    if (p.preco && r.preco > p.preco * 1.2) alerta = 'Preço subiu mais de 20%: a oferta acabou?';
    else if ((p.desconto ?? 0) > 0 && !desconto) alerta = 'O desconto sumiu: a oferta acabou?';

    await db
      .from('produtos')
      .update({
        preco: r.preco,
        preco_antes: precoAntes,
        desconto,
        disponivel: true,
        preco_atualizado_em: agora,
        ultima_coleta_em: agora,
        ultimo_erro: null,
        alerta,
      })
      .eq('id', p.id);
    await db.from('historico_precos').insert({ produto_id: p.id, preco: r.preco, preco_antes: precoAntes, coletado_em: agora });
    return { status: 'atualizado' };
  } catch (e) {
    if (e instanceof LinkQuebradoError) {
      await db
        .from('produtos')
        .update({ disponivel: false, alerta: ALERTA_LINK_QUEBRADO, ultima_coleta_em: agora, ultimo_erro: e.message })
        .eq('id', p.id);
      return { status: 'falha', erro: e.message };
    }
    const erro = e instanceof Error ? e.message : String(e);
    // Mantém o último preço válido; a página pública esconde o número depois de 24 h.
    await db.from('produtos').update({ ultima_coleta_em: agora, ultimo_erro: erro }).eq('id', p.id);
    return { status: 'falha', erro };
  }
}

/**
 * Tempo máximo de cada rodada. No Netlify cada chamada de função tem limite de
 * tempo, então a rotina trabalha em fatias: atualiza os produtos com coleta mais
 * antiga até o tempo acabar e devolve quantos faltam para a próxima chamada.
 */
const ORCAMENTO_MS = Number(process.env.PRECOS_ORCAMENTO_MS) || 8_000;

type OpcoesAtualizacao = {
  origem: string;
  /** Só um produto (botão ↻ do painel). */
  ids?: string[];
  /** Só produtos cuja última coleta é anterior a este instante (ou que nunca foram coletados). */
  antesDe?: string;
};

/** Atualiza os produtos ativos das lojas com coleta automática, em lotes e dentro do tempo limite. */
export async function atualizarPrecos(opcoes: OpcoesAtualizacao) {
  const inicio = Date.now();
  const db = supabaseServico();
  let consulta = db
    .from('produtos')
    .select(CAMPOS + ', ultima_coleta_em')
    .eq('ativo', true)
    .order('ultima_coleta_em', { ascending: true, nullsFirst: true });
  if (opcoes.ids?.length) consulta = consulta.in('id', opcoes.ids);
  if (opcoes.antesDe) consulta = consulta.or(`ultima_coleta_em.is.null,ultima_coleta_em.lt.${opcoes.antesDe}`);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);

  // Lojas sem coleta automática (Shopee) ficam de fora: o preço delas é digitado no painel.
  const fila = (data as unknown as ProdutoColeta[]).filter((p) => adaptadorPara(p.link, p.loja)?.coletaAutomatica);
  if (fila.length === 0) return { total: 0, atualizados: 0, falhas: 0, restantes: 0, erros: [] };

  const { data: coleta } = await db.from('coletas').insert({ origem: opcoes.origem, total: 0 }).select('id').single();

  let processados = 0;
  let atualizados = 0;
  let falhas = 0;
  const erros: { produto_id: string; nome: string; erro: string }[] = [];

  while (processados < fila.length && Date.now() - inicio < ORCAMENTO_MS) {
    const lote = fila.slice(processados, processados + TAMANHO_LOTE);
    const resultados = await Promise.all(lote.map(atualizarUm));
    resultados.forEach((r, j) => {
      if (r.status === 'atualizado') atualizados++;
      if (r.status === 'falha') falhas++;
      if (r.erro) erros.push({ produto_id: lote[j].id, nome: lote[j].nome, erro: r.erro });
    });
    processados += lote.length;
  }

  if (coleta) {
    await db
      .from('coletas')
      .update({ finalizada_em: new Date().toISOString(), total: processados, atualizados, falhas, erros })
      .eq('id', coleta.id);
  }

  revalidatePath('/', 'layout');
  return { total: processados, atualizados, falhas, restantes: fila.length - processados, erros };
}

/** Cadastro inteligente: a partir do link, devolve nome, foto, preço e preço antigo. */
export async function previaDoLink(link: string) {
  const adaptador = adaptadorPara(link);
  if (!adaptador) return { erro: 'Ainda não sei ler esta loja. Preencha os dados à mão.' };
  try {
    const id = await comTentativas(() => adaptador.identificar(link), 2);
    if (!adaptador.coletaAutomatica) {
      return { loja: adaptador.loja, lojaItemId: id.lojaItemId, manual: true as const };
    }
    const r = await comTentativas(() => adaptador.coletar({ link, lojaItemId: id.lojaItemId }), 2);
    return {
      loja: adaptador.loja,
      lojaItemId: id.lojaItemId,
      nome: r.nome ?? null,
      foto: r.foto ?? null,
      preco: r.preco,
      precoAntes: r.precoAntes && r.preco && r.precoAntes > r.preco ? r.precoAntes : null,
      disponivel: r.disponivel,
      fonte: r.fonte,
    };
  } catch (e) {
    return { loja: adaptador.loja, erro: e instanceof Error ? e.message : 'Não consegui ler o link.' };
  }
}

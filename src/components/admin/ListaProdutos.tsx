'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import { alternarCampo, dispensarAlerta, excluirProduto, importarCsv, reordenarProdutos } from '@/app/admin/acoes';
import { atualizarTodosOsPrecos } from '@/lib/atualizarTodos';
import { FotoProduto } from '@/components/FotoProduto';
import { brl, precoAutomatico, precoVencido, tempoDesde } from '@/lib/format';
import type { Categoria, Coleta, Produto } from '@/lib/types';
import { Sparkline } from './Sparkline';
import { Aviso, Botao, BotaoLink, Entrada, Interruptor, Seletor, Titulo } from './ui';

type Props = {
  produtos: Produto[];
  categorias: Categoria[];
  cliques: Record<string, { total: number; ultimos_7_dias: number }>;
  historico: Record<string, { preco: number; coletado_em: string }[]>;
  ultimaColeta: Coleta | null;
  agora: number;
};

type Mensagem = { tipo: 'info' | 'erro' | 'alerta'; texto: string } | null;

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function ListaProdutos({ produtos: iniciais, categorias, cliques, historico, ultimaColeta, agora }: Props) {
  const router = useRouter();
  const [produtos, setProdutos] = useState(iniciais);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>('');
  const [mensagem, setMensagem] = useState<Mensagem>(null);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [, iniciar] = useTransition();
  const arquivoCsv = useRef<HTMLInputElement>(null);

  // Mantém o estado local alinhado quando o servidor manda dados novos.
  const [base, setBase] = useState(iniciais);
  if (base !== iniciais) {
    setBase(iniciais);
    setProdutos(iniciais);
  }

  const nomeCategoria = useMemo(() => Object.fromEntries(categorias.map((c) => [c.id, c.nome])), [categorias]);
  const termo = normalizar(busca.trim());
  const filtrando = Boolean(termo || filtro);
  const visiveis = produtos.filter((p) => {
    if (filtro === 'alertas') return Boolean(p.alerta || p.ultimo_erro || !p.disponivel);
    if (filtro === 'inativos') return !p.ativo;
    if (filtro && p.categoria_id !== filtro) return false;
    return !termo || normalizar(`${p.nome} ${p.loja}`).includes(termo);
  });
  const comAlerta = produtos.filter((p) => p.alerta || !p.disponivel).length;

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoArrastar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const de = produtos.findIndex((p) => p.id === e.active.id);
    const para = produtos.findIndex((p) => p.id === e.over!.id);
    const nova = arrayMove(produtos, de, para);
    setProdutos(nova);
    iniciar(async () => {
      const r = await reordenarProdutos(nova.map((p) => p.id));
      if (!r.ok) {
        setMensagem({ tipo: 'erro', texto: r.erro });
        setProdutos(produtos);
      }
    });
  }

  function alternar(p: Produto, campo: 'ativo' | 'destaque', valor: boolean) {
    setProdutos((l) => l.map((x) => (x.id === p.id ? { ...x, [campo]: valor } : x)));
    iniciar(async () => {
      const r = await alternarCampo(p.id, campo, valor);
      if (!r.ok) {
        setMensagem({ tipo: 'erro', texto: r.erro });
        setProdutos((l) => l.map((x) => (x.id === p.id ? { ...x, [campo]: !valor } : x)));
      }
    });
  }

  function excluir(p: Produto) {
    if (!confirm(`Excluir "${p.nome}"? Isso não pode ser desfeito.`)) return;
    iniciar(async () => {
      const r = await excluirProduto(p.id);
      if (r.ok) setProdutos((l) => l.filter((x) => x.id !== p.id));
      else setMensagem({ tipo: 'erro', texto: r.erro });
    });
  }

  function limparAlerta(p: Produto, reexibir: boolean) {
    iniciar(async () => {
      const r = await dispensarAlerta(p.id, reexibir);
      if (r.ok) router.refresh();
      else setMensagem({ tipo: 'erro', texto: r.erro });
    });
  }

  async function atualizarPrecos(id?: string) {
    setAtualizando(id ?? 'todos');
    setMensagem(id ? null : { tipo: 'info', texto: 'Atualizando os preços…' });
    try {
      let r: { total: number; atualizados: number; falhas: number };
      if (id) {
        const res = await fetch('/api/admin/precos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        r = await res.json();
        if (!res.ok) throw new Error((r as { erro?: string }).erro ?? 'Falha ao atualizar.');
      } else {
        r = await atualizarTodosOsPrecos((feitos, faltam) =>
          setMensagem({ tipo: 'info', texto: `Atualizando os preços… ${feitos} prontos${faltam ? `, faltam ${faltam}` : ''}.` }),
        );
      }
      setMensagem(
        r.falhas
          ? { tipo: 'alerta', texto: `${r.atualizados} de ${r.total} atualizados. ${r.falhas} com erro: veja a aba Preços.` }
          : { tipo: 'info', texto: id ? 'Preço atualizado.' : `Pronto! ${r.atualizados} produtos atualizados. Os da Shopee seguem com o preço do painel.` },
      );
      router.refresh();
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Falha ao atualizar.' });
    } finally {
      setAtualizando(null);
    }
  }

  async function importar(arquivo: File) {
    const texto = await arquivo.text();
    if (arquivoCsv.current) arquivoCsv.current.value = '';
    iniciar(async () => {
      const r = await importarCsv(texto);
      if (!r.ok) return setMensagem({ tipo: 'erro', texto: r.erro });
      const { criados, atualizados, erros } = r.dados!;
      setMensagem({
        tipo: erros.length ? 'alerta' : 'info',
        texto: `${criados} produto(s) criados e ${atualizados} atualizados.${erros.length ? ` Avisos: ${erros.slice(0, 5).join(' ')}` : ''}`,
      });
      router.refresh();
    });
  }

  return (
    <>
      <Titulo
        acoes={
          <>
            <Botao onClick={() => atualizarPrecos()} disabled={atualizando !== null}>
              {atualizando === 'todos' ? 'Atualizando…' : 'Atualizar preços agora'}
            </Botao>
            <BotaoLink href="/admin/produtos/novo" principal>
              + Produto
            </BotaoLink>
          </>
        }
      >
        Produtos
      </Titulo>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-suave">
        <span>
          {produtos.length} produtos · {produtos.filter((p) => p.ativo && p.disponivel).length} na página pública
        </span>
        {ultimaColeta ? (
          <span>
            Última coleta {tempoDesde(ultimaColeta.iniciada_em, agora)}:{' '}
            {ultimaColeta.finalizada_em ? `${ultimaColeta.atualizados} ok, ${ultimaColeta.falhas} com erro` : 'em andamento'}
          </span>
        ) : (
          <span>Nenhuma coleta automática ainda.</span>
        )}
        <a href="/api/admin/csv" className="text-rosa-700 hover:underline">
          Exportar CSV
        </a>
        <label className="cursor-pointer text-rosa-700 hover:underline">
          Importar CSV
          <input ref={arquivoCsv} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </label>
      </div>

      {mensagem && (
        <div className="mb-4">
          <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Entrada type="search" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" className="rounded-full px-4" />
        <Seletor value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar" className="rounded-full px-4 sm:w-64">
          <option value="">Todas as categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
              {!c.ativa ? ' (oculta)' : ''}
            </option>
          ))}
          <option value="alertas">⚠ Com alerta ({comAlerta})</option>
          <option value="inativos">Inativos</option>
        </Seletor>
      </div>

      {filtrando && visiveis.length > 0 && <p className="mb-2 text-xs text-suave">Limpe a busca e o filtro para reordenar arrastando.</p>}

      {produtos.length === 0 ? (
        <div className="rounded-card border border-dashed border-borda p-10 text-center text-suave">
          Nenhum produto ainda. <Link href="/admin/produtos/novo" className="text-rosa-700 underline">Cadastre o primeiro</Link> ou importe um CSV.
        </div>
      ) : visiveis.length === 0 ? (
        <p className="p-10 text-center text-suave">Nenhum produto encontrado.</p>
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
          <SortableContext items={visiveis.map((p) => p.id)} strategy={verticalListSortingStrategy} disabled={filtrando}>
            <ul className="flex flex-col gap-2">
              {visiveis.map((p) => (
                <Linha
                  key={p.id}
                  p={p}
                  categoria={p.categoria_id ? nomeCategoria[p.categoria_id] : 'Sem categoria'}
                  cliques={cliques[p.id]}
                  historico={historico[p.id] ?? []}
                  agora={agora}
                  arrastavel={!filtrando}
                  atualizando={atualizando === p.id}
                  aoAlternar={alternar}
                  aoExcluir={excluir}
                  aoAtualizar={() => atualizarPrecos(p.id)}
                  aoLimparAlerta={limparAlerta}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}

type LinhaProps = {
  p: Produto;
  categoria: string;
  cliques?: { total: number; ultimos_7_dias: number };
  historico: { preco: number; coletado_em: string }[];
  agora: number;
  arrastavel: boolean;
  atualizando: boolean;
  aoAlternar: (p: Produto, campo: 'ativo' | 'destaque', v: boolean) => void;
  aoExcluir: (p: Produto) => void;
  aoAtualizar: () => void;
  aoLimparAlerta: (p: Produto, reexibir: boolean) => void;
};

function Linha({ p, categoria, cliques, historico, agora, arrastavel, atualizando, aoAlternar, aoExcluir, aoAtualizar, aoLimparAlerta }: LinhaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id, disabled: !arrastavel });
  const vencido = precoVencido(p, agora);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-card border bg-card p-3 shadow-card ${isDragging ? 'z-10 border-rosa-500 shadow-2xl' : 'border-borda'} ${!p.ativo ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          disabled={!arrastavel}
          aria-label={`Arrastar ${p.nome} para reordenar`}
          className="cursor-grab touch-none rounded px-1 text-lg text-suave disabled:cursor-default disabled:opacity-30"
        >
          ⠿
        </button>

        <div className="relative size-14 flex-none overflow-hidden rounded-lg bg-white">
          {p.foto_url ? <FotoProduto src={p.foto_url} alt="" sizes="56px" /> : null}
        </div>

        <div className="min-w-0 flex-1 basis-48">
          <Link href={`/admin/produtos/${p.id}`} className="block truncate font-bold hover:text-rosa-700">
            {p.nome}
          </Link>
          <p className="truncate text-xs text-suave">
            {categoria} · {p.loja}
            {p.loja_item_id ? ` · ${p.loja_item_id}` : ''}
          </p>
        </div>

        <div className="w-28 text-right">
          <p className={`font-display text-xl font-extrabold ${vencido ? 'text-suave' : 'text-rosa-700'}`}>{p.preco != null ? brl(p.preco) : '—'}</p>
          <p className="text-[11px] text-suave">
            {!precoAutomatico(p.link, p.loja) ? 'manual' : p.preco_manual ? 'travado' : p.preco_atualizado_em ? tempoDesde(p.preco_atualizado_em, agora) : 'sem data'}
            {p.desconto ? ` · -${p.desconto}%` : ''}
          </p>
        </div>

        <Sparkline pontos={historico} />

        <div className="w-16 text-center" title="Cliques em Comprar (total · últimos 7 dias)">
          <p className="font-display text-xl font-extrabold">{cliques?.total ?? 0}</p>
          <p className="text-[11px] text-suave">{cliques?.ultimos_7_dias ?? 0} em 7 d</p>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-suave">
          <span className="flex flex-col items-center gap-1">
            <Interruptor ligado={p.ativo} aoMudar={(v) => aoAlternar(p, 'ativo', v)} rotulo={`Ativo: ${p.nome}`} />
            ativo
          </span>
          <span className="flex flex-col items-center gap-1">
            <Interruptor ligado={p.destaque} aoMudar={(v) => aoAlternar(p, 'destaque', v)} rotulo={`Destaque: ${p.nome}`} />
            destaque
          </span>
        </div>

        <div className="flex gap-1.5">
          <Botao
            pequeno
            onClick={aoAtualizar}
            disabled={atualizando || p.preco_manual || !precoAutomatico(p.link, p.loja)}
            title={precoAutomatico(p.link, p.loja) ? 'Buscar o preço na loja agora' : 'Esta loja não informa o preço: edite à mão'}
          >
            {atualizando ? '…' : '↻'}
            <span className="sr-only">Atualizar preço</span>
          </Botao>
          <BotaoLink href={`/admin/produtos/${p.id}`} className="px-3.5 py-2 text-[11px]">
            Editar
          </BotaoLink>
          <Botao pequeno perigo onClick={() => aoExcluir(p)} aria-label={`Excluir ${p.nome}`}>
            ✕
          </Botao>
        </div>
      </div>

      {(p.alerta || !p.disponivel || p.ultimo_erro) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-elevado px-3 py-2 text-xs">
          {(p.alerta || !p.disponivel) && (
            <span className="font-bold text-rosa-700">
              ⚠ {p.alerta ?? 'Indisponível'}
              {!p.disponivel ? ' · fora da página pública' : ''}
            </span>
          )}
          {p.ultimo_erro && <span className="text-suave">Última coleta falhou: {p.ultimo_erro}</span>}
          <span className="ml-auto flex gap-2">
            {!p.disponivel && (
              <button type="button" onClick={() => aoLimparAlerta(p, true)} className="text-rosa-700 hover:underline">
                Mostrar de novo
              </button>
            )}
            {p.alerta && p.disponivel && (
              <button type="button" onClick={() => aoLimparAlerta(p, false)} className="text-rosa-700 hover:underline">
                Dispensar
              </button>
            )}
          </span>
        </div>
      )}
    </li>
  );
}

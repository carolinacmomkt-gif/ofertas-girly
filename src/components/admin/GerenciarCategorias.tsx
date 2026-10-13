'use client';

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { alternarCategoria, criarCategoria, excluirCategoria, renomearCategoria, reordenarCategorias, type Resposta } from '@/app/admin/acoes';
import type { Categoria } from '@/lib/types';
import { Aviso, Botao, Entrada, Interruptor } from './ui';

export function GerenciarCategorias({ categorias: iniciais, contagem }: { categorias: Categoria[]; contagem: Record<string, number> }) {
  const router = useRouter();
  const [lista, setLista] = useState(iniciais);
  const [base, setBase] = useState(iniciais);
  if (base !== iniciais) {
    setBase(iniciais);
    setLista(iniciais);
  }
  const [nova, setNova] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, iniciar] = useTransition();

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function rodar(acao: () => Promise<Resposta<unknown>>) {
    setErro('');
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      router.refresh();
    });
  }

  function aoArrastar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const nova = arrayMove(
      lista,
      lista.findIndex((c) => c.id === e.active.id),
      lista.findIndex((c) => c.id === e.over!.id),
    );
    setLista(nova);
    rodar(() => reordenarCategorias(nova.map((c) => c.id)));
  }

  return (
    <div className="max-w-2xl">
      <form
        className="mb-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nova.trim()) return;
          rodar(async () => {
            const r = await criarCategoria(nova);
            if (r.ok) setNova('');
            return r;
          });
        }}
      >
        <Entrada placeholder="Nova categoria" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Nome da nova categoria" />
        <Botao principal type="submit" disabled={ocupado || !nova.trim()} className="flex-none">
          Criar
        </Botao>
      </form>

      {erro && (
        <div className="mb-4">
          <Aviso tipo="erro">{erro}</Aviso>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="text-suave">Nenhuma categoria ainda.</p>
      ) : (
        <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoArrastar}>
          <SortableContext items={lista.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2">
              {lista.map((c) => (
                <LinhaCategoria
                  key={c.id}
                  c={c}
                  total={contagem[c.id] ?? 0}
                  aoRenomear={(nome) => rodar(() => renomearCategoria(c.id, nome))}
                  aoAlternar={(v) => {
                    setLista((l) => l.map((x) => (x.id === c.id ? { ...x, ativa: v } : x)));
                    rodar(() => alternarCategoria(c.id, v));
                  }}
                  aoExcluir={() => confirm(`Excluir a categoria "${c.nome}"?`) && rodar(() => excluirCategoria(c.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      <p className="mt-4 text-xs text-suave">
        Arraste para mudar a ordem na página pública. Categoria oculta some da página junto com os produtos dela. O link de
        cada categoria é /categoria/nome.
      </p>
    </div>
  );
}

function LinhaCategoria({
  c,
  total,
  aoRenomear,
  aoAlternar,
  aoExcluir,
}: {
  c: Categoria;
  total: number;
  aoRenomear: (nome: string) => void;
  aoAlternar: (v: boolean) => void;
  aoExcluir: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  const [nome, setNome] = useState(c.nome);
  const mudou = nome.trim() !== c.nome;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-wrap items-center gap-3 rounded-card border bg-card p-3 shadow-card ${isDragging ? 'z-10 border-rosa-500' : 'border-borda'} ${!c.ativa ? 'opacity-60' : ''}`}
    >
      <button type="button" {...attributes} {...listeners} aria-label={`Arrastar ${c.nome}`} className="cursor-grab touch-none px-1 text-lg text-suave">
        ⠿
      </button>
      <form
        className="flex min-w-0 flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (mudou) aoRenomear(nome);
        }}
      >
        <Entrada value={nome} onChange={(e) => setNome(e.target.value)} aria-label={`Nome da categoria ${c.nome}`} className="py-2" />
        {mudou && (
          <Botao pequeno principal type="submit">
            Salvar
          </Botao>
        )}
      </form>
      <span className="w-24 text-xs text-suave">
        {total} produto{total === 1 ? '' : 's'}
        <br />/{c.slug}
      </span>
      <span className="flex items-center gap-2 text-xs text-suave">
        <Interruptor ligado={c.ativa} aoMudar={aoAlternar} rotulo={`Mostrar ${c.nome} na página`} />
        {c.ativa ? 'visível' : 'oculta'}
      </span>
      <Botao pequeno perigo onClick={aoExcluir} aria-label={`Excluir ${c.nome}`} disabled={total > 0} title={total > 0 ? 'Mova ou exclua os produtos antes' : undefined}>
        ✕
      </Botao>
    </li>
  );
}

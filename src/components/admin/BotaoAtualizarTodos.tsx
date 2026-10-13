'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { atualizarTodosOsPrecos } from '@/lib/atualizarTodos';
import { Botao } from './ui';

export function BotaoAtualizarTodos() {
  const router = useRouter();
  const [estado, setEstado] = useState<'parado' | 'rodando' | string>('parado');

  async function rodar() {
    setEstado('rodando');
    try {
      const r = await atualizarTodosOsPrecos();
      setEstado(`${r.atualizados} de ${r.total} atualizados${r.falhas ? `, ${r.falhas} com erro` : ''}`);
      router.refresh();
    } catch (e) {
      setEstado(e instanceof Error ? e.message : 'Falhou');
    }
  }

  return (
    <div className="flex items-center gap-3">
      {estado !== 'parado' && estado !== 'rodando' && (
        <span role="status" className="text-xs text-suave">
          {estado}
        </span>
      )}
      <Botao principal onClick={rodar} disabled={estado === 'rodando'}>
        {estado === 'rodando' ? 'Atualizando…' : 'Atualizar preços agora'}
      </Botao>
    </div>
  );
}

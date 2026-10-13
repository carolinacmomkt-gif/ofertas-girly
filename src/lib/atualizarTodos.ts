/** Chama a atualização em fatias até acabar a fila (uso no navegador). */
export async function atualizarTodosOsPrecos(aoProgredir?: (feitos: number, faltam: number) => void) {
  const antesDe = new Date().toISOString();
  let total = 0;
  let atualizados = 0;
  let falhas = 0;
  for (let rodada = 0; rodada < 30; rodada++) {
    const res = await fetch('/api/admin/precos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ antesDe }),
    });
    const r = await res.json();
    if (!res.ok) throw new Error(r.erro ?? 'Falha ao atualizar.');
    total += r.total;
    atualizados += r.atualizados;
    falhas += r.falhas;
    aoProgredir?.(total, r.restantes);
    if (!r.restantes || !r.total) break;
  }
  return { total, atualizados, falhas };
}

import { NextResponse, type NextRequest } from 'next/server';
import { adminOuNulo } from '@/lib/admin';
import { atualizarPrecos } from '@/lib/precos/atualizar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * "Atualizar preços agora".
 * body { id } atualiza um produto; body { antesDe } atualiza uma fatia dos produtos
 * coletados antes desse instante (o painel repete a chamada até restantes = 0).
 */
export async function POST(req: NextRequest) {
  if (!(await adminOuNulo())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string; antesDe?: string };
  try {
    const r = body.id
      ? await atualizarPrecos({ origem: 'manual (produto)', ids: [body.id] })
      : await atualizarPrecos({ origem: 'manual', antesDe: body.antesDe ?? new Date().toISOString() });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Falha na coleta' }, { status: 500 });
  }
}

import { NextResponse, type NextRequest } from 'next/server';
import { atualizarPrecos } from '@/lib/precos/atualizar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Preços valem 2 h; com folga, entra na fila quem foi coletado há mais de 100 min. */
const INTERVALO_MS = 100 * 60_000;

/**
 * Chamado a cada 10 min pela função agendada do Netlify (netlify/functions/precos-agendados.mts).
 * Cada chamada atualiza uma fatia dos produtos; em poucas rodadas todos ficam em dia.
 */
async function executar(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  }
  try {
    const antesDe = new Date(Date.now() - INTERVALO_MS).toISOString();
    return NextResponse.json(await atualizarPrecos({ origem: 'automática', antesDe }));
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Falha na coleta' }, { status: 500 });
  }
}

export const GET = executar;
export const POST = executar;

import { NextResponse, type NextRequest } from 'next/server';
import { adminOuNulo } from '@/lib/admin';
import { previaDoLink } from '@/lib/precos/atualizar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await adminOuNulo())) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { link } = (await req.json().catch(() => ({}))) as { link?: string };
  if (!link || !/^https?:\/\//i.test(link)) return NextResponse.json({ erro: 'Cole um link começando com https://' }, { status: 400 });
  return NextResponse.json(await previaDoLink(link.trim()));
}

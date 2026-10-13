import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublico } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const texto = await req.text().catch(() => '');
  let id: unknown;
  try {
    id = JSON.parse(texto).id;
  } catch {
    id = null;
  }
  if (typeof id !== 'string' || !UUID.test(id)) return new NextResponse(null, { status: 400 });
  await supabasePublico().rpc('registrar_clique', { p_produto_id: id });
  return new NextResponse(null, { status: 204 });
}

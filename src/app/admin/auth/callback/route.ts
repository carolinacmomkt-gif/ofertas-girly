import { NextResponse, type NextRequest } from 'next/server';
import { supabaseSessao } from '@/lib/supabase/server';

/** Volta do link mágico enviado por e-mail. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const destino = new URL('/admin', req.url);
  if (code) {
    const supabase = await supabaseSessao();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL('/admin/login?erro=link-invalido', req.url));
  }
  return NextResponse.redirect(destino);
}

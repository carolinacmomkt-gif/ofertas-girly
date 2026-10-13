import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const rotaLivre = pathname === '/admin/login' || pathname.startsWith('/admin/auth');
  if (!user && pathname.startsWith('/api/')) {
    return NextResponse.json({ erro: 'Faça login.' }, { status: 401 });
  }
  if (!user && !rotaLivre) {
    const destino = request.nextUrl.clone();
    destino.pathname = '/admin/login';
    destino.search = '';
    return NextResponse.redirect(destino);
  }
  return response;
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };

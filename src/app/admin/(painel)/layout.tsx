import type { Metadata } from 'next';
import Link from 'next/link';
import { CopiarLink } from '@/components/admin/CopiarLink';
import { exigirAdmin } from '@/lib/admin';
import { siteUrl } from '@/lib/format';

export const metadata: Metadata = { title: 'Painel', robots: { index: false } };

const MENU = [
  { href: '/admin', rotulo: 'Produtos' },
  { href: '/admin/categorias', rotulo: 'Categorias' },
  { href: '/admin/precos', rotulo: 'Preços' },
];

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { user } = await exigirAdmin();
  return (
    <>
      <div aria-hidden className="rose h-1.5" />
      <header className="border-b border-borda bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link href="/admin" className="texto-rose font-display text-2xl font-extrabold">
            Painel
          </Link>
          <nav aria-label="Seções do painel" className="flex gap-1">
            {MENU.map((m) => (
              <Link key={m.href} href={m.href} className="rounded-full px-3 py-2 text-sm font-semibold text-suave hover:bg-elevado hover:text-texto">
                {m.rotulo}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="rounded-full border-[1.5px] border-borda px-3.5 py-2 text-[11px] font-extrabold hover:border-rosa-500"
            >
              Ver página pública
            </a>
            <CopiarLink url={siteUrl()} />
            <form action="/admin/auth/sair" method="post">
              <button
                type="submit"
                title={user.email}
                className="rounded-full px-3 py-2 text-[11px] font-extrabold text-suave hover:text-texto"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </>
  );
}

import type { Metadata } from 'next';
import { FormLogin } from './FormLogin';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };

const MENSAGENS: Record<string, string> = {
  'sem-permissao': 'Este e-mail não está na lista de administradores.',
  'link-invalido': 'O link de acesso expirou ou já foi usado. Peça outro.',
};

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <>
      <div aria-hidden className="rose h-1.5" />
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4">
        <h1 className="mb-1 font-display text-4xl font-extrabold">Painel</h1>
        <p className="mb-6 text-sm text-suave">Entre para cadastrar e editar seus achadinhos.</p>
        <FormLogin erroInicial={erro ? MENSAGENS[erro] : undefined} semPermissao={erro === 'sem-permissao'} />
      </main>
    </>
  );
}

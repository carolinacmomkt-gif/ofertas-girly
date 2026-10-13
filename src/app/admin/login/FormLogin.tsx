'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Botao, Campo, Entrada } from '@/components/admin/ui';
import { supabaseNavegador } from '@/lib/supabase/browser';

export function FormLogin({ erroInicial, semPermissao }: { erroInicial?: string; semPermissao?: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [modo, setModo] = useState<'senha' | 'link'>('senha');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(erroInicial ?? '');
  const [aviso, setAviso] = useState('');

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setAviso('');
    setCarregando(true);
    const supabase = supabaseNavegador();
    if (semPermissao) await supabase.auth.signOut();
    try {
      if (modo === 'senha') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
        router.replace('/admin');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/admin/auth/callback`, shouldCreateUser: false },
        });
        if (error) throw new Error(error.message);
        setAviso('Pronto! Abra o link que enviamos para o seu e-mail neste mesmo navegador.');
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="flex flex-col gap-4">
      <Campo rotulo="E-mail">
        <Entrada type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Campo>
      {modo === 'senha' && (
        <Campo rotulo="Senha">
          <Entrada type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
      )}
      {erro && (
        <p role="alert" className="rounded-lg border border-urgencia/50 bg-urgencia/10 p-3 text-sm">
          {erro}
        </p>
      )}
      {aviso && (
        <p role="status" className="rounded-lg border border-rosa-500 bg-card p-3 text-sm">
          {aviso}
        </p>
      )}
      <Botao principal type="submit" disabled={carregando}>
        {carregando ? 'Entrando…' : modo === 'senha' ? 'Entrar' : 'Receber link de acesso'}
      </Botao>
      <button
        type="button"
        onClick={() => setModo(modo === 'senha' ? 'link' : 'senha')}
        className="text-sm text-rosa-700 underline-offset-4 hover:underline"
      >
        {modo === 'senha' ? 'Prefiro receber um link no e-mail' : 'Entrar com senha'}
      </button>
    </form>
  );
}

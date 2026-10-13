import Link from 'next/link';
import { BotaoAtualizarTodos } from '@/components/admin/BotaoAtualizarTodos';
import { Aviso, Titulo } from '@/components/admin/ui';
import { exigirAdmin } from '@/lib/admin';
import { tempoDesde } from '@/lib/format';
import type { Coleta } from '@/lib/types';

export const dynamic = 'force-dynamic';

const configurado = (...vars: string[]) => vars.every((v) => Boolean(process.env[v]));

export default async function Precos() {
  const { supabase } = await exigirAdmin();
  const agora = Date.now();
  const [coletas, problemas] = await Promise.all([
    supabase.from('coletas').select('*').order('iniciada_em', { ascending: false }).limit(10),
    supabase
      .from('produtos')
      .select('id, nome, loja, alerta, ultimo_erro, disponivel, ultima_coleta_em')
      .or('ultimo_erro.not.is.null,alerta.not.is.null,disponivel.eq.false')
      .order('nome'),
  ]);
  const lista = (coletas.data ?? []) as Coleta[];

  const fontes = [
    { nome: 'Mercado Livre (API oficial)', ok: configurado('ML_CLIENT_ID', 'ML_CLIENT_SECRET') || configurado('ML_ACCESS_TOKEN') },
    { nome: 'Rotina automática a cada 10 min (CRON_SECRET)', ok: configurado('CRON_SECRET') },
    { nome: 'Chave de servidor (SUPABASE_SERVICE_ROLE_KEY)', ok: configurado('SUPABASE_SERVICE_ROLE_KEY') },
  ];

  return (
    <>
      <Titulo acoes={<BotaoAtualizarTodos />}>Preços</Titulo>

      <section className="mb-8 grid gap-2 sm:grid-cols-2">
        {fontes.map((f) => (
          <div key={f.nome} className="flex items-center gap-2 rounded-xl border border-borda bg-card p-3 text-sm">
            <span aria-hidden className={`size-2.5 rounded-full ${f.ok ? 'bg-rosa-500' : 'bg-urgencia'}`} />
            {f.nome}: <strong>{f.ok ? 'configurado' : 'falta configurar'}</strong>
          </div>
        ))}
      </section>

      <p className="mb-8 text-sm text-suave">
        Mercado Livre: preço atualizado sozinho a cada 2 h. Shopee: a loja não informa o preço automaticamente, então
        vale o preço que você digitar no produto.
      </p>

      <h2 className="mb-3 font-display text-2xl font-extrabold">Produtos com problema</h2>
      {(problemas.data ?? []).length === 0 ? (
        <p className="mb-8 text-sm text-suave">Nenhum problema na última coleta.</p>
      ) : (
        <ul className="mb-8 flex flex-col gap-2">
          {problemas.data!.map((p) => (
            <li key={p.id} className="rounded-xl border border-borda bg-card p-3 text-sm">
              <Link href={`/admin/produtos/${p.id}`} className="font-bold hover:text-rosa-700">
                {p.nome}
              </Link>{' '}
              <span className="text-suave">· {p.loja}</span>
              {(p.alerta || !p.disponivel) && <p className="text-rosa-700">⚠ {p.alerta ?? 'Indisponível'}</p>}
              {p.ultimo_erro && (
                <p className="text-suave">
                  Erro: {p.ultimo_erro}
                  {p.ultima_coleta_em ? ` (${tempoDesde(p.ultima_coleta_em, agora)})` : ''}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-3 font-display text-2xl font-extrabold">Últimas coletas</h2>
      {lista.length === 0 ? (
        <Aviso>Nenhuma coleta ainda. Clique em &quot;Atualizar preços agora&quot; ou configure a rotina automática (veja o README).</Aviso>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-suave">
              <tr>
                <th className="py-2 pr-4">Quando</th>
                <th className="py-2 pr-4">Origem</th>
                <th className="py-2 pr-4">Produtos</th>
                <th className="py-2 pr-4">Atualizados</th>
                <th className="py-2 pr-4">Com erro</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-t border-borda">
                  <td className="py-2 pr-4">{tempoDesde(c.iniciada_em, agora)}</td>
                  <td className="py-2 pr-4">{c.origem}</td>
                  <td className="py-2 pr-4">{c.total}</td>
                  <td className="py-2 pr-4">{c.finalizada_em ? c.atualizados : 'em andamento'}</td>
                  <td className="py-2 pr-4">{c.falhas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

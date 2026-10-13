import { NextResponse } from 'next/server';
import { adminOuNulo } from '@/lib/admin';
import { gerarCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = await adminOuNulo();
  if (!admin) return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
  const { data, error } = await admin.supabase
    .from('produtos')
    .select('nome, preco, preco_antes, desconto, loja, link, foto_url, descricao, destaque, ativo, ordem, categorias(nome, ordem)')
    .order('ordem');
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  type Linha = (typeof data)[number] & { categorias: { nome: string; ordem: number } | null };
  const linhas = (data as Linha[])
    .sort((a, b) => (a.categorias?.ordem ?? 999) - (b.categorias?.ordem ?? 999) || a.ordem - b.ordem)
    .map((p) => ({ ...p, categoria: p.categorias?.nome ?? 'Outros' }));

  const data_ = new Date().toISOString().slice(0, 10);
  return new NextResponse(gerarCsv(linhas), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="produtos-${data_}.csv"`,
    },
  });
}

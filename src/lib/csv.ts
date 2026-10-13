import { parseNumero } from './format';

/** Colunas da planilha, na ordem de exportação. */
export const COLUNAS_CSV = ['Produto', 'Categoria', 'Preço antes', 'Preço', 'Desconto', 'Loja', 'Link', 'Foto', 'Descrição', 'Destaque', 'Ativo'] as const;

export type LinhaCsv = {
  nome: string;
  categoria: string;
  preco_antes: number | null;
  preco: number | null;
  desconto: number | null;
  loja: string;
  link: string;
  foto_url: string | null;
  descricao: string | null;
  destaque: boolean;
  ativo: boolean;
};

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Nomes de coluna aceitos na importação (sem acento, minúsculos, sem espaços). */
const ALIASES: Record<keyof LinhaCsv, string[]> = {
  nome: ['produto', 'nome', 'nomedoproduto'],
  categoria: ['categoria'],
  preco_antes: ['precoantes', 'de', 'precode', 'precooriginal', 'precoantigo'],
  preco: ['preco', 'por', 'precopor', 'precoatual', 'precocomdesconto'],
  desconto: ['desconto', 'off', 'descontopercentual'],
  loja: ['loja', 'site', 'marketplace'],
  link: ['link', 'url', 'linkdeafiliado', 'linkdecompra'],
  foto_url: ['foto', 'imagem', 'fotourl', 'urldafoto'],
  descricao: ['descricao'],
  destaque: ['destaque'],
  ativo: ['ativo'],
};

function separarLinhas(texto: string, sep: string): string[][] {
  const linhas: string[][] = [];
  let campo = '';
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') aspas = false;
      else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim()));
}

const simNao = (v: string | undefined, padrao: boolean) => {
  if (v == null || !v.trim()) return padrao;
  return /^(1|s|sim|true|x|yes)$/i.test(v.trim());
};

export function lerCsv(textoBruto: string): { linhas: LinhaCsv[]; erros: string[] } {
  const texto = textoBruto.replace(/^﻿/, '');
  const primeira = texto.split(/\r?\n/, 1)[0] ?? '';
  const sep = (primeira.match(/;/g)?.length ?? 0) >= (primeira.match(/,/g)?.length ?? 0) ? ';' : ',';
  const [cabecalho, ...dados] = separarLinhas(texto, sep);
  if (!cabecalho) return { linhas: [], erros: ['Arquivo vazio.'] };

  const indice = {} as Record<keyof LinhaCsv, number>;
  const cab = cabecalho.map(normalizar);
  (Object.keys(ALIASES) as (keyof LinhaCsv)[]).forEach((k) => {
    indice[k] = cab.findIndex((c) => ALIASES[k].includes(c));
  });
  const erros: string[] = [];
  if (indice.nome < 0 || indice.link < 0) return { linhas: [], erros: ['O arquivo precisa ter as colunas "Produto" e "Link".'] };

  const linhas: LinhaCsv[] = [];
  dados.forEach((l, n) => {
    const v = (k: keyof LinhaCsv) => (indice[k] >= 0 ? (l[indice[k]] ?? '').trim() : '');
    const nome = v('nome');
    const link = v('link');
    if (!nome || !/^https?:\/\//i.test(link)) {
      erros.push(`Linha ${n + 2}: falta o nome ou o link.`);
      return;
    }
    const desconto = parseNumero(v('desconto'));
    linhas.push({
      nome,
      link,
      categoria: v('categoria') || 'Outros',
      preco: parseNumero(v('preco')),
      preco_antes: parseNumero(v('preco_antes')),
      desconto: desconto != null ? Math.round(Math.abs(desconto) <= 1 && desconto !== 0 ? desconto * 100 : Math.abs(desconto)) : null,
      loja: v('loja') || (/shopee|shope\.ee/i.test(link) ? 'Shopee' : /meli\.la|mercadoli/i.test(link) ? 'Mercado Livre' : 'Loja'),
      foto_url: v('foto_url') || null,
      descricao: v('descricao') || null,
      destaque: simNao(indice.destaque >= 0 ? l[indice.destaque] : undefined, false),
      ativo: simNao(indice.ativo >= 0 ? l[indice.ativo] : undefined, true),
    });
  });
  return { linhas, erros };
}

const celula = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const numeroBr = (n: number | null) => (n == null ? '' : String(n).replace('.', ','));

export function gerarCsv(linhas: LinhaCsv[]): string {
  const corpo = linhas.map((p) =>
    [
      p.nome,
      p.categoria,
      numeroBr(p.preco_antes),
      numeroBr(p.preco),
      p.desconto ?? '',
      p.loja,
      p.link,
      p.foto_url ?? '',
      p.descricao ?? '',
      p.destaque ? 'sim' : 'não',
      p.ativo ? 'sim' : 'não',
    ]
      .map(celula)
      .join(';'),
  );
  // BOM para o Excel abrir com acentos corretos.
  return '﻿' + [COLUNAS_CSV.join(';'), ...corpo].join('\r\n') + '\r\n';
}

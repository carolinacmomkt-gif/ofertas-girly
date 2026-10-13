export type Categoria = {
  id: string;
  nome: string;
  slug: string;
  ordem: number;
  ativa: boolean;
};

export type Produto = {
  id: string;
  nome: string;
  descricao: string | null;
  categoria_id: string | null;
  preco: number | null;
  preco_antes: number | null;
  desconto: number | null;
  loja: string;
  link: string;
  loja_item_id: string | null;
  disponivel: boolean;
  preco_atualizado_em: string | null;
  preco_manual: boolean;
  foto_url: string | null;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  ultima_coleta_em: string | null;
  ultimo_erro: string | null;
  alerta: string | null;
  created_at: string;
  updated_at: string;
};

/** Campos que a página pública precisa. */
export type ProdutoPublico = Pick<
  Produto,
  | 'id'
  | 'nome'
  | 'descricao'
  | 'categoria_id'
  | 'preco'
  | 'preco_antes'
  | 'desconto'
  | 'loja'
  | 'link'
  | 'foto_url'
  | 'destaque'
  | 'ordem'
  | 'preco_atualizado_em'
  | 'preco_manual'
>;

export type HistoricoPreco = {
  produto_id: string;
  preco: number;
  preco_antes: number | null;
  coletado_em: string;
};

export type Coleta = {
  id: number;
  iniciada_em: string;
  finalizada_em: string | null;
  origem: string;
  total: number;
  atualizados: number;
  falhas: number;
  erros: { produto_id: string; nome: string; erro: string }[];
};

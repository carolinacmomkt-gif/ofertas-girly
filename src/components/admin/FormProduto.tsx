'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { salvarProduto, type DadosProduto } from '@/app/admin/acoes';
import { CardProduto } from '@/components/public/CardProduto';
import { brl, calcularDesconto, parseNumero, precoAutomatico } from '@/lib/format';
import type { Categoria, Produto } from '@/lib/types';
import { FotoUpload } from './FotoUpload';
import { Sparkline } from './Sparkline';
import { AreaTexto, Aviso, Botao, BotaoLink, Campo, Entrada, Interruptor, Seletor } from './ui';

const LOJAS = ['Mercado Livre', 'Shopee', 'Amazon', 'Magalu'];
const NOVA = '__nova__';

const paraTexto = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','));

type Previa = {
  erro?: string;
  loja?: string;
  lojaItemId?: string | null;
  nome?: string | null;
  foto?: string | null;
  preco?: number | null;
  precoAntes?: number | null;
  disponivel?: boolean;
  fonte?: string;
  manual?: boolean;
};

type Props = {
  produto?: Produto;
  categorias: Categoria[];
  historico?: { preco: number; coletado_em: string }[];
  agora: number;
};

export function FormProduto({ produto, categorias, historico = [], agora }: Props) {
  const router = useRouter();
  const [salvando, iniciar] = useTransition();
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [lendoLink, setLendoLink] = useState(false);

  const [link, setLink] = useState(produto?.link ?? '');
  const [lojaItemId, setLojaItemId] = useState<string | null>(produto?.loja_item_id ?? null);
  const [nome, setNome] = useState(produto?.nome ?? '');
  const [descricao, setDescricao] = useState(produto?.descricao ?? '');
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id ?? categorias[0]?.id ?? NOVA);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [loja, setLoja] = useState(produto?.loja ?? 'Mercado Livre');
  const [preco, setPreco] = useState(paraTexto(produto?.preco));
  const [precoAntes, setPrecoAntes] = useState(paraTexto(produto?.preco_antes));
  const [descontoDigitado, setDescontoDigitado] = useState(produto?.preco_antes ? '' : paraTexto(produto?.desconto));
  const [foto, setFoto] = useState<string | null>(produto?.foto_url ?? null);
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [precoManual, setPrecoManual] = useState(produto?.preco_manual ?? false);

  const automatico = precoAutomatico(link, loja);
  const precoN = parseNumero(preco);
  const antesN = parseNumero(precoAntes);
  const descontoCalculado = calcularDesconto(precoN, antesN);
  const desconto = descontoCalculado ?? parseNumero(descontoDigitado);

  /** Cadastro inteligente: busca nome, foto e preços a partir do link. */
  async function lerLink(url = link) {
    if (!/^https?:\/\//i.test(url.trim())) return;
    setLendoLink(true);
    setErro('');
    setAviso('');
    try {
      const res = await fetch('/api/admin/previa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: url.trim() }),
      });
      const r = (await res.json()) as Previa;
      if (r.loja) setLoja(r.loja);
      if (r.lojaItemId) setLojaItemId(r.lojaItemId);
      if (r.manual) {
        setAviso(`Link da ${r.loja} reconhecido. Essa loja não informa nome, foto nem preço automaticamente: preencha à mão. O preço fica como você digitar.`);
        return;
      }
      if (r.erro) {
        setAviso(`Não consegui ler tudo automaticamente (${r.erro}). Confira e preencha o que faltar.`);
        return;
      }
      if (r.nome && (!produto || !nome)) setNome(r.nome);
      if (r.foto && !foto) setFoto(r.foto);
      if (r.preco != null) {
        setPreco(paraTexto(r.preco));
        setPrecoAntes(paraTexto(r.precoAntes));
        setDescontoDigitado('');
      }
      setAviso(
        r.disponivel === false
          ? 'A loja informa que este produto está indisponível.'
          : `Dados preenchidos a partir da ${r.fonte ?? 'loja'}${r.preco != null ? ` (${brl(r.preco)})` : ''}. Revise e escolha a categoria.`,
      );
    } catch {
      setAviso('Não consegui ler o link agora. Preencha os dados à mão.');
    } finally {
      setLendoLink(false);
    }
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (categoriaId === NOVA && !novaCategoria.trim()) return setErro('Digite o nome da nova categoria.');
    const dados: DadosProduto = {
      id: produto?.id,
      nome,
      descricao: descricao || null,
      categoria_id: categoriaId === NOVA ? null : categoriaId,
      nova_categoria: categoriaId === NOVA ? novaCategoria : null,
      loja,
      preco: precoN,
      preco_antes: antesN,
      desconto,
      link,
      foto_url: foto,
      loja_item_id: lojaItemId,
      destaque,
      ativo,
      preco_manual: automatico ? precoManual : true,
    };
    iniciar(async () => {
      const r = await salvarProduto(dados);
      if (!r.ok) return setErro(r.erro);
      router.push('/admin');
      router.refresh();
    });
  }

  const previa = {
    id: produto?.id ?? 'previa',
    nome: nome || 'Nome do produto',
    descricao: descricao || null,
    categoria_id: null,
    preco: precoN,
    preco_antes: antesN && precoN && antesN > precoN ? antesN : null,
    desconto: desconto ? Math.round(desconto) : null,
    loja: loja || 'Loja',
    link: link || '#',
    foto_url: foto,
    destaque,
    ordem: 0,
    preco_atualizado_em: new Date(agora).toISOString(),
    preco_manual: true,
  };

  return (
    <form onSubmit={salvar} className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-5">
        <Campo rotulo="Link de compra (afiliado)" dica="Cole o link e eu busco nome, foto e preço na loja.">
          <div className="flex gap-2">
            <Entrada
              type="url"
              required
              placeholder="https://meli.la/... ou https://s.shopee.com.br/..."
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLojaItemId(null);
              }}
              onPaste={(e) => {
                const colado = e.clipboardData.getData('text');
                if (colado) setTimeout(() => lerLink(colado), 0);
              }}
            />
            <Botao onClick={() => lerLink()} disabled={lendoLink || !link} className="flex-none">
              {lendoLink ? 'Lendo…' : 'Buscar dados'}
            </Botao>
          </div>
        </Campo>

        {aviso && <Aviso tipo="alerta">{aviso}</Aviso>}

        <Campo rotulo="Foto" grupo>
          <FotoUpload valor={foto} aoMudar={setFoto} />
        </Campo>

        <Campo rotulo="Nome do produto">
          <Entrada required value={nome} onChange={(e) => setNome(e.target.value)} maxLength={140} />
        </Campo>

        <Campo rotulo="Descrição curta" dica="Opcional. Aparece abaixo do nome, em até 3 linhas.">
          <AreaTexto rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={280} />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Campo rotulo="Categoria">
              <Seletor value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                    {!c.ativa ? ' (oculta)' : ''}
                  </option>
                ))}
                <option value={NOVA}>+ Nova categoria…</option>
              </Seletor>
            </Campo>
            {categoriaId === NOVA && (
              <Entrada
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                placeholder="Nome da nova categoria (ex.: Pets)"
                aria-label="Nome da nova categoria"
                autoFocus
              />
            )}
          </div>
          <Campo rotulo="Loja">
            <Entrada list="lojas" value={loja} onChange={(e) => setLoja(e.target.value)} required />
            <datalist id="lojas">
              {LOJAS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Campo>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo rotulo="Preço (R$)">
            <Entrada inputMode="decimal" placeholder="65,45" value={preco} onChange={(e) => setPreco(e.target.value)} />
          </Campo>
          <Campo rotulo="Preço antes (R$)" dica="Opcional">
            <Entrada inputMode="decimal" placeholder="239,90" value={precoAntes} onChange={(e) => setPrecoAntes(e.target.value)} />
          </Campo>
          <Campo rotulo="Desconto (%)" dica={descontoCalculado != null ? 'Calculado pelos preços' : 'Digite se não tiver o preço antes'}>
            <Entrada
              inputMode="numeric"
              value={descontoCalculado != null ? String(descontoCalculado) : descontoDigitado}
              onChange={(e) => setDescontoDigitado(e.target.value)}
              readOnly={descontoCalculado != null}
              className={descontoCalculado != null ? 'text-suave' : ''}
            />
          </Campo>
        </div>

        <div className="flex flex-col gap-3 rounded-card border border-borda p-4">
          <Opcao rotulo="Ativo" dica="Aparece na página pública." ligado={ativo} aoMudar={setAtivo} />
          <Opcao rotulo="Destaque" dica="Entra na seção Destaques, no topo." ligado={destaque} aoMudar={setDestaque} />
          {automatico ? (
            <Opcao
              rotulo="Travar preço"
              dica="A atualização automática não mexe no preço deste produto."
              ligado={precoManual}
              aoMudar={setPrecoManual}
            />
          ) : (
            <p className="text-xs text-suave">
              <strong className="text-texto">Preço manual.</strong> A {loja || 'loja'} não informa o preço automaticamente: quando
              a oferta mudar, atualize o preço aqui.
            </p>
          )}
        </div>

        {produto && (
          <div className="flex flex-col gap-2 rounded-card border border-borda p-4 text-sm">
            <p className="text-xs font-extrabold text-rosa-700">Histórico de preço (30 dias)</p>
            <Sparkline pontos={historico} largura={320} altura={64} />
            <p className="text-xs text-suave">
              ID na loja: {produto.loja_item_id ?? 'não identificado'}
              {produto.ultimo_erro ? ` · Último erro: ${produto.ultimo_erro}` : ''}
            </p>
          </div>
        )}

        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        <div className="flex justify-end gap-3">
          <BotaoLink href="/admin">Cancelar</BotaoLink>
          <Botao principal type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-extrabold text-rosa-700">Prévia do card</p>
        <div className="max-w-[260px]">
          <CardProduto produto={previa} agora={agora} previa />
        </div>
      </aside>
    </form>
  );
}

function Opcao({ rotulo, dica, ligado, aoMudar }: { rotulo: string; dica: string; ligado: boolean; aoMudar: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-bold">{rotulo}</p>
        <p className="text-xs text-suave">{dica}</p>
      </div>
      <Interruptor ligado={ligado} aoMudar={aoMudar} rotulo={rotulo} />
    </div>
  );
}

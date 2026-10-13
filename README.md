# Achadinhos fofos · link na bio (@my_girlystyle)

Catálogo de achadinhos com links de afiliada, feito para o link da bio do Instagram. É uma cópia do site
`carolinacmomkt-gif/ofertas` (mesmas funcionalidades), com identidade visual "girlie" e dados próprios.
Usa um **projeto Supabase e um site Netlify novos**, separados do primeiro site.

- **`/`**: página pública, somente leitura, mobile first.
- **`/categoria/skincare`** (e as outras): a mesma página já filtrada, para divulgar nos stories.
- **`/admin`**: painel com login, onde você cadastra, edita, reordena e exclui produtos e categorias.
- **Preços automáticos (Mercado Livre)**: o site busca o preço atual na loja e atualiza sozinho, no máximo a cada 2 horas.
  Na Shopee o preço é o que você digita no painel (a Shopee não informa o preço automaticamente).

Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS 4 + Supabase (Postgres, Auth e Storage), com deploy no Netlify.

---

## Estrutura de pastas

```
├── data/produtos-iniciais.json      12 produtos iniciais (fonte do seed)
├── docs/prints/                     prints do visual novo (celular, painel, Open Graph)
├── scripts/gerar-seed.mjs           gera supabase/seed.sql a partir do JSON
├── supabase/
│   ├── migrations/0001_schema.sql   tabelas, RLS, bucket "fotos"
│   └── seed.sql                     seu e-mail de admin + 6 categorias + 12 produtos
├── netlify/functions/
│   └── precos-agendados.mts         chama a rotina de preços a cada 10 min
├── netlify.toml
└── src/
    ├── middleware.ts                renova a sessão e protege /admin
    ├── app/
    │   ├── page.tsx                 página pública
    │   ├── categoria/[slug]/        URL por categoria
    │   ├── opengraph-image.tsx      imagem de prévia do WhatsApp
    │   ├── admin/
    │   │   ├── login/               login (senha ou link mágico)
    │   │   ├── (painel)/            produtos, categorias, preços
    │   │   └── acoes.ts             server actions do painel
    │   └── api/
    │       ├── clique/              contagem de cliques em "Comprar"
    │       ├── cron/precos/         rotina de preços (chamada pelo Netlify)
    │       └── admin/               prévia do link, "atualizar agora", CSV
    ├── components/public/           cabeçalho, catálogo, card
    ├── components/admin/            lista, formulário, upload de foto, categorias
    └── lib/
        ├── precos/                  um adaptador por loja + rotina de atualização
        │   ├── mercadolivre.ts
        │   ├── shopee.ts
        │   └── atualizar.ts
        ├── supabase/                clientes (navegador, sessão, público, serviço)
        └── csv.ts, format.ts, types.ts
```

---

## 1. Criar o projeto no Supabase

1. Em [supabase.com](https://supabase.com), clique em **New project** e crie um projeto **novo** (ex.: `my-girlystyle`,
   região São Paulo, `sa-east-1`). Não use o projeto do primeiro site: cada site tem o seu banco, as suas fotos e os
   seus administradores.
2. Abra **SQL Editor > New query**, cole todo o conteúdo de `supabase/migrations/0001_schema.sql` e clique em **Run**.
3. Numa nova query, cole `supabase/seed.sql` e rode. Isso libera `carolinacmomkt@gmail.com` como administradora e
   cria as 6 categorias (Beleza, Skincare, Moda, Acessórios, Casa, Papelaria) e os 12 produtos da Shopee.
4. Crie o seu usuário em **Authentication > Users > Add user > Create new user** com o e-mail
   `carolinacmomkt@gmail.com` e uma senha (marque *Auto Confirm User*).
5. Pronto: esse e-mail já pode entrar no painel.

6. Em **Authentication > URL Configuration**:
   - **Site URL**: o endereço do site (ex.: `https://my-girlystyle.netlify.app`).
   - **Redirect URLs**: adicione `https://SEU-SITE/admin/auth/callback` e `http://localhost:3000/admin/auth/callback`.
     Isso é necessário para o login por link mágico.
7. Em **Project Settings > API**, copie a *Project URL*, a chave `anon` e a chave `service_role`.

> **Adicionar outro administrador:** crie o usuário em *Authentication > Users* e rode
> `insert into public.admins (email) values ('outra-pessoa@exemplo.com');`.
> Para remover: `delete from public.admins where email = '...';`.
> Quem fizer login sem estar nessa tabela não consegue alterar nada (o banco bloqueia pelo RLS).

## 2. Rodar no seu computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev
```

Abra `http://localhost:3000` (página pública) e `http://localhost:3000/admin` (painel).

## 3. Publicar no Netlify

1. Em [app.netlify.com](https://app.netlify.com), clique em **Add new site > Import an existing project**, escolha
   GitHub e o repositório `ofertas-girly` (é um site **novo**; não mexa no site do primeiro repositório). O Netlify reconhece o Next.js e usa o `netlify.toml` (não precisa mudar nada no
   build).
2. Antes de publicar, em **Site configuration > Environment variables**, cadastre:

   | Variável | Onde pegar |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > `anon` |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > `service_role` (secreta) |
   | `NEXT_PUBLIC_SITE_URL` | o endereço final do site, sem barra no fim (ex.: `https://my-girlystyle.netlify.app`) |
   | `CRON_SECRET` | invente uma senha longa (ex.: `openssl rand -hex 32`) |
   | `ML_CLIENT_ID`, `ML_CLIENT_SECRET` | opcional, ver seção 5 |

   Ao cadastrar, marque **Contains secret values** só em `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` e
   `ML_CLIENT_SECRET`. **Nunca marque como secreta uma variável que começa com `NEXT_PUBLIC_`**: o Netlify esconde o
   valor do build e a página fica sem conectar ao Supabase.

3. Clique em **Deploy**. Para trocar o endereço, use **Domain management** (ex.: `my-girlystyle.netlify.app`
   ou um domínio próprio) e depois atualize `NEXT_PUBLIC_SITE_URL` e a *Site URL* do Supabase (passo 1.6).

As credenciais e a `service_role` ficam só no servidor. Nenhuma delas tem o prefixo `NEXT_PUBLIC_`, então nunca
chegam ao navegador.

## 4. Atualização automática de preços

Não precisa configurar nada além do `CRON_SECRET`: a função agendada `netlify/functions/precos-agendados.mts` roda a
cada 10 minutos no site publicado e chama `/api/cron/precos`. Você vê as execuções em
**Logs > Functions > precos-agendados** no Netlify.

Como cada chamada de função no Netlify tem tempo limitado, a rotina trabalha em fatias: em cada rodada atualiza, por
cerca de 8 segundos, os produtos com a coleta mais antiga (mais de 100 minutos). Em poucas rodadas todos ficam em dia,
então nenhum preço do Mercado Livre fica com mais de ~2 h. O botão **Atualizar preços agora** do painel faz o mesmo,
repetindo as rodadas até terminar.

Como funciona:

- Ao salvar um produto, o link curto (`meli.la`, `s.shopee.com.br`) é seguido até a página final e o ID do produto
  é guardado em `loja_item_id`. O botão "Comprar" continua usando o seu link de afiliada.
- Os produtos são processados 5 por vez, com nova tentativa e espera crescente em caso de erro.
- Cada coleta grava o preço em `historico_precos` (gráfico no painel).
- Produto indisponível ou com link quebrado sai da página pública e aparece com alerta no painel.
- Se a coleta falhar, continua valendo o último preço. Se ele tiver mais de 24 h, o card mostra só
  "Ver preço na loja".
- Se o preço subir mais de 20% ou o desconto sumir, o produto ganha o alerta "a oferta acabou?".
- **Travar preço** (no formulário do produto) faz a rotina ignorar o preço daquele item.

## 5. Lojas

**Mercado Livre.** O preço é lido sem credencial, pela página do seu link de afiliada (testado com os links da
planilha). Para usar também a API oficial, crie um app em
[developers.mercadolivre.com.br](https://developers.mercadolivre.com.br/devcenter) e preencha `ML_CLIENT_ID` e
`ML_CLIENT_SECRET`. Se a API falhar, a página continua sendo usada como reserva.

**Shopee.** A Shopee não tem API de preço disponível e a página do produto não mostra o preço sem JavaScript. Por
isso, nos produtos da Shopee, nome, foto e preço são preenchidos por você no painel, e o preço digitado vale sempre
(fica marcado como "manual" e nunca é escondido). Ao colar o link da Shopee, o painel reconhece a loja e o produto, mas
o resto é à mão. Quando uma oferta da Shopee mudar, edite o preço no painel.

**Outras lojas (Amazon, Magalu).** Crie `src/lib/precos/amazon.ts` implementando `AdaptadorLoja` (veja
`tipos.ts`) e inclua o adaptador na lista em `src/lib/precos/index.ts`. Se a loja não informar o preço, use
`coletaAutomatica: false` e inclua o nome dela em `LOJAS_PRECO_MANUAL`, em `src/lib/format.ts`.

## 6. Importar e exportar CSV

No painel, **Exportar CSV** gera um arquivo com as colunas:

```
Produto;Categoria;Preço antes;Preço;Desconto;Loja;Link;Foto;Descrição;Destaque;Ativo
```

**Importar CSV** aceita o mesmo formato (separado por `;` ou `,`). Os produtos são reconhecidos pelo link: se o link
já existe, o produto é atualizado; se não, é criado. Categorias novas são criadas automaticamente.

## 7. Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run typecheck` | checagem de tipos |
| `npm run seed:gerar` | regenera `supabase/seed.sql` a partir de `data/produtos-iniciais.json` |

## Produtos iniciais: o que falta completar no painel

Os 12 links são da Shopee, que não informa o preço automaticamente. Nome, categoria e foto já vêm do seed; o **preço**
você digita no painel (até lá o card mostra "Ver preço na loja"). Dois casos pedem atenção:

- `https://s.shopee.com.br/5q8u0G8oKE` abre um **vídeo** da Shopee (bolsa de viagem dobrável), não a página do
  produto. Entrou sem foto: envie uma pelo painel ou troque por um link de produto.
- `https://shope.ee/9zYZl56gQT` não mostrou o produto (pode ter saído do ar). Entrou **oculto**, com o nome
  "Achadinho Shopee (complete no painel)". Abra o link, preencha nome, foto, categoria e preço e ligue **Ativo**.

## Visual "girlie"

- Cores: tokens no `@theme` de `src/app/globals.css` (fundo `#FFF5F8`, cards brancos, bordas `#F6CFDD`, texto
  `#3B1F2B`, texto secundário `#8A5A6B`, rosas e lilás de apoio). Todos os textos têm contraste AA.
- Gradiente rosé (`rose`): botões principais, chip ativo, selo de desconto e faixa do topo, sempre com texto vinho.
- Texto em gradiente (`texto-rose`, de `#B83268` a `#D9578A`): só no @ e nos preços, sempre em tamanho grande.
- Fontes em `src/app/fontes.ts`: Fraunces (600/800, itálico no @ e nos títulos das categorias) e Nunito (400/600/800).
- Cards com raio de 20 px e sombra rosada; ao passar o mouse, sobem 2 px e a borda fica `#E76F9A`.
- Imagem de prévia (WhatsApp/Instagram): `src/app/opengraph-image.tsx`.
- Prints em `docs/prints/` (feitos com dados e preços de exemplo).

## Perfil e textos

O @, a frase de apresentação e o selo ficam em `PERFIL`, no fim de `src/lib/format.ts`. Os avisos do rodapé estão em
`src/components/public/Cabecalho.tsx`.

import { carregarCatalogo } from '@/lib/catalogo';
import { supabaseConfigurado } from '@/lib/supabase/env';
import { Cabecalho, Rodape } from './Cabecalho';
import { Catalogo } from './Catalogo';

export async function PaginaCatalogo({ categoria }: { categoria?: string }) {
  let conteudo: React.ReactNode;
  if (!supabaseConfigurado()) {
    conteudo = (
      <p className="py-10 text-center text-suave">
        Faltam as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY. Cadastre no Netlify (ou no
        .env.local) e publique de novo.
      </p>
    );
  } else {
    try {
      const { categorias, produtos } = await carregarCatalogo();
      conteudo = <Catalogo categorias={categorias} produtos={produtos} categoriaInicial={categoria} agora={Date.now()} />;
    } catch {
      conteudo = (
        <p className="py-10 text-center text-suave" role="alert">
          Não deu para carregar os produtos agora. Atualize a página em alguns segundos.
        </p>
      );
    }
  }

  return (
    <>
      <div aria-hidden className="rose h-1.5" />
      <div className="mx-auto max-w-[720px] px-4 pb-16">
        <Cabecalho />
        {conteudo}
        <Rodape />
      </div>
    </>
  );
}

import { PERFIL } from '@/lib/format';

export function Cabecalho() {
  return (
    <header className="flex flex-col items-center gap-2 pt-8 pb-5 text-center">
      <h1 className="texto-rose font-display text-[38px] leading-tight font-extrabold italic sm:text-[46px]">{PERFIL.handle}</h1>
      <p className="max-w-[420px] text-sm leading-normal text-suave">{PERFIL.bio}</p>
      <p className="mt-1 flex items-center gap-2 rounded-full border border-borda bg-elevado px-3.5 py-1.5 text-xs font-extrabold text-texto">
        <span aria-hidden className="size-2 rounded-full bg-rosa-500" />
        {PERFIL.selo}
      </p>
    </header>
  );
}

export function Rodape() {
  return (
    <footer className="mt-10 space-y-2 text-center text-xs leading-normal text-suave">
      <p>Preços e estoque podem mudar a qualquer momento. Dá uma conferida no site da loja antes de comprar.</p>
      <p>
        Os links desta página são de afiliado: quando você compra por eles, eu recebo uma pequena comissão da loja, sem
        custo extra para você.
      </p>
    </footer>
  );
}

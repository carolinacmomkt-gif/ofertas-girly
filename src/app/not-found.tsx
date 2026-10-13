import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <>
      <div aria-hidden className="rose h-1.5" />
      <main className="mx-auto flex max-w-[720px] flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="font-display text-5xl font-extrabold">Página não encontrada</h1>
        <p className="text-suave">Esse link não existe mais, mas todos os achadinhos estão te esperando na página principal.</p>
        <Link href="/" className="rose rounded-full px-6 py-3 text-sm font-extrabold">
          Ver achadinhos
        </Link>
      </main>
    </>
  );
}

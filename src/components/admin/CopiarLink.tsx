'use client';

import { useState } from 'react';

export function CopiarLink({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copie o link:', url);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className="rose rounded-full px-3.5 py-2 text-[11px] font-extrabold"
      aria-live="polite"
    >
      {copiado ? '✓ Link copiado' : 'Copiar link'}
    </button>
  );
}

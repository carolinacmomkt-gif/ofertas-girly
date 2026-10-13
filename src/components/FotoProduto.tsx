'use client';

import Image from 'next/image';
import { useState } from 'react';
import { fotoOtimizavel } from '@/lib/format';

type Props = {
  src: string;
  alt: string;
  sizes: string;
  prioridade?: boolean;
};

/**
 * Foto do produto em fundo branco. Usa o otimizador de imagens para fotos das lojas;
 * se o otimizador falhar, mostra a imagem original para a foto nunca sumir.
 */
export function FotoProduto({ src, alt, sizes, prioridade }: Props) {
  const [falhou, setFalhou] = useState<string | null>(null);
  const semOtimizar = falhou === src || !fotoOtimizavel(src);

  return (
    <Image
      key={semOtimizar ? `${src}#original` : src}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className="object-contain"
      unoptimized={semOtimizar}
      priority={prioridade}
      loading={prioridade ? undefined : 'lazy'}
      onError={() => setFalhou(src)}
    />
  );
}

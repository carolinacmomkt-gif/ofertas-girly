'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { supabaseNavegador } from '@/lib/supabase/browser';
import { Botao, Entrada } from './ui';

const LADO_MAX = 1000;

async function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error('Não consegui abrir esta imagem.'));
    img.src = src;
  });
}

/**
 * Recorta o quadrado escolhido, reduz para até 1000 px e converte para WebP.
 * O Safari não gera WebP; nesse caso a foto sai em JPEG.
 */
async function recortarFoto(src: string, area: Area): Promise<{ blob: Blob; extensao: string }> {
  const img = await carregarImagem(src);
  const lado = Math.min(LADO_MAX, Math.round(area.width));
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, lado, lado);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, lado, lado);
  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, 0.85));
  const webp = await gerar('image/webp');
  if (webp?.type === 'image/webp') return { blob: webp, extensao: 'webp' };
  const jpeg = await gerar('image/jpeg');
  if (!jpeg) throw new Error('Seu navegador não conseguiu gerar a foto.');
  return { blob: jpeg, extensao: 'jpg' };
}

export function FotoUpload({ valor, aoMudar }: { valor: string | null; aoMudar: (url: string | null) => void }) {
  const [origem, setOrigem] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [fotoQuebrada, setFotoQuebrada] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  const aoCompletar = useCallback((_: Area, px: Area) => setArea(px), []);

  function abrir(arquivo: File | undefined) {
    setErro('');
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) return setErro('Escolha um arquivo de imagem.');
    if (arquivo.size > 15 * 1024 * 1024) return setErro('Imagem muito grande (máximo 15 MB).');
    setOrigem(URL.createObjectURL(arquivo));
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }

  async function confirmar() {
    if (!origem || !area) return;
    setEnviando(true);
    setErro('');
    try {
      const { blob, extensao } = await recortarFoto(origem, area);
      const caminho = `produtos/${crypto.randomUUID()}.${extensao}`;
      const supabase = supabaseNavegador();
      const { error } = await supabase.storage.from('fotos').upload(caminho, blob, { contentType: blob.type, cacheControl: '31536000' });
      if (error) throw new Error(error.message);
      aoMudar(supabase.storage.from('fotos').getPublicUrl(caminho).data.publicUrl);
      URL.revokeObjectURL(origem);
      setOrigem(null);
    } catch (e) {
      setErro(e instanceof Error ? `Falha no envio: ${e.message}` : 'Falha no envio.');
    } finally {
      setEnviando(false);
    }
  }

  if (origem) {
    return (
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white">
          <Cropper image={origem} crop={crop} zoom={zoom} aspect={1} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={aoCompletar} objectFit="contain" />
        </div>
        <label className="flex items-center gap-3 text-xs text-suave">
          Zoom
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-rosa-500" />
        </label>
        {erro && <p role="alert" className="text-sm text-urgencia">{erro}</p>}
        <div className="flex gap-2">
          <Botao onClick={() => setOrigem(null)} disabled={enviando}>
            Cancelar
          </Botao>
          <Botao principal onClick={confirmar} disabled={enviando || !area}>
            {enviando ? 'Enviando…' : 'Usar este recorte'}
          </Botao>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          abrir(e.dataTransfer.files[0]);
        }}
        className={`flex items-center gap-4 rounded-xl border-2 border-dashed p-3 transition ${arrastando ? 'border-rosa-500 bg-elevado' : 'border-borda'}`}
      >
        <div className="flex size-20 flex-none items-center justify-center overflow-hidden rounded-lg border border-borda bg-white">
          {valor ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valor}
              alt="Foto atual"
              className="size-full object-contain"
              onLoad={() => setFotoQuebrada(null)}
              onError={() => setFotoQuebrada(valor)}
            />
          ) : (
            <span className="text-[10px] text-suave">Sem foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-suave">Arraste a foto aqui ou</span>
          <div className="flex flex-wrap gap-2">
            <Botao pequeno onClick={() => entrada.current?.click()}>
              Escolher arquivo
            </Botao>
            {valor && (
              <Botao pequeno perigo onClick={() => aoMudar(null)}>
                Remover
              </Botao>
            )}
          </div>
        </div>
        <input ref={entrada} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => abrir(e.target.files?.[0])} />
      </div>
      <Entrada type="url" placeholder="ou cole a URL da foto" value={valor ?? ''} onChange={(e) => aoMudar(e.target.value.trim() || null)} aria-label="URL da foto" />
      {valor && fotoQuebrada === valor && (
        <p role="alert" className="text-sm text-rosa-700">
          Não consegui abrir essa foto. Cole o endereço da própria imagem (no navegador, clique com o botão direito na foto
          e escolha &quot;Copiar endereço da imagem&quot;) ou envie o arquivo.
        </p>
      )}
      {erro && <p role="alert" className="text-sm text-urgencia">{erro}</p>}
    </div>
  );
}

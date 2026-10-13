import { brl } from '@/lib/format';

/** Gráfico pequeno do histórico de preço. */
export function Sparkline({ pontos, largura = 96, altura = 28 }: { pontos: { preco: number; coletado_em: string }[]; largura?: number; altura?: number }) {
  if (pontos.length < 2) return <span className="text-[11px] text-suave">sem histórico</span>;
  const precos = pontos.map((p) => p.preco);
  const min = Math.min(...precos);
  const max = Math.max(...precos);
  const faixa = max - min || 1;
  const coords = pontos.map((p, i) => {
    const x = (i / (pontos.length - 1)) * (largura - 4) + 2;
    const y = altura - 2 - ((p.preco - min) / faixa) * (altura - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const ultimo = coords[coords.length - 1].split(',');
  const descricao = `Preço entre ${brl(min)} e ${brl(max)} em ${pontos.length} coletas`;
  return (
    <svg width={largura} height={altura} viewBox={`0 0 ${largura} ${altura}`} role="img" aria-label={descricao}>
      <title>{descricao}</title>
      <polyline points={coords.join(' ')} fill="none" stroke="#E76F9A" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ultimo[0]} cy={ultimo[1]} r="2.5" fill="#C2416F" />
    </svg>
  );
}

import Link from 'next/link';
import { forwardRef } from 'react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-50';
const estilos = {
  principal: 'rose hover:brightness-110',
  secundario: 'border-[1.5px] border-borda hover:border-rosa-500',
  perigo: 'border-[1.5px] border-borda hover:border-urgencia hover:text-urgencia',
};

type BotaoProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { principal?: boolean; perigo?: boolean; pequeno?: boolean };

export function Botao({ principal, perigo, pequeno, className = '', ...props }: BotaoProps) {
  const estilo = principal ? estilos.principal : perigo ? estilos.perigo : estilos.secundario;
  return <button type="button" {...props} className={`${base} ${estilo} ${pequeno ? 'px-3.5 py-2 text-[11px]' : ''} ${className}`} />;
}

export function BotaoLink({
  principal,
  className = '',
  ...props
}: React.ComponentProps<typeof Link> & { principal?: boolean }) {
  return <Link {...props} className={`${base} ${principal ? estilos.principal : estilos.secundario} ${className}`} />;
}

type CampoProps = { rotulo: string; dica?: string; children: React.ReactNode; className?: string; grupo?: boolean };

/** Rótulo + controle. Com `grupo`, vira um fieldset (para vários controles juntos). */
export function Campo({ rotulo, dica, children, className = '', grupo }: CampoProps) {
  const estilo = `flex flex-col gap-1.5 text-xs font-extrabold text-rosa-700 ${className}`;
  const ajuda = dica ? <span className="text-[11px] font-normal text-suave">{dica}</span> : null;
  if (grupo) {
    return (
      <fieldset className={estilo}>
        <legend className="mb-1.5">{rotulo}</legend>
        <div className="font-normal">{children}</div>
        {ajuda}
      </fieldset>
    );
  }
  return (
    <label className={estilo}>
      {rotulo}
      {children}
      {ajuda}
    </label>
  );
}

const campoBase =
  'w-full rounded-[10px] border border-borda bg-card p-3 text-sm font-normal text-texto outline-none placeholder:text-suave/70 focus:border-rosa-500';

export const Entrada = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Entrada(
  { className = '', ...props },
  ref,
) {
  return <input ref={ref} {...props} className={`${campoBase} ${className}`} />;
});

export function AreaTexto({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${campoBase} ${className}`} />;
}

export function Seletor({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${campoBase} ${className}`} />;
}

export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  disabled,
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={() => aoMudar(!ligado)}
      className={`relative h-6 w-11 flex-none rounded-full border transition disabled:opacity-50 ${
        ligado ? 'border-transparent bg-rosa-500' : 'border-borda bg-elevado'
      }`}
    >
      <span className={`absolute top-0.5 size-[18px] rounded-full bg-white shadow-sm transition-all ${ligado ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'erro' | 'alerta'; children: React.ReactNode }) {
  const cor =
    tipo === 'erro' ? 'border-urgencia/60 bg-urgencia/10' : tipo === 'alerta' ? 'border-rosa-500/60 bg-rosa-500/10' : 'border-borda bg-card';
  return (
    <div role={tipo === 'erro' ? 'alert' : 'status'} className={`rounded-xl border p-3 text-sm ${cor}`}>
      {children}
    </div>
  );
}

export function Titulo({ children, acoes }: { children: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-display text-4xl font-extrabold">{children}</h1>
      {acoes ? <div className="flex flex-wrap gap-2">{acoes}</div> : null}
    </div>
  );
}

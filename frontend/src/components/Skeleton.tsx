import estilos from '../styles/Skeleton.module.css';

// Bloco cinza animado exibido enquanto os dados carregam.
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`${estilos.bloco} ${className}`} style={style} />;
}

// Imita as linhas de uma tabela enquanto os dados carregam.
export function TabelaSkeleton({ linhas = 5, colunas = 5 }: { linhas?: number; colunas?: number }) {
  return (
    <div className={estilos.tabelaSkeleton}>
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className={estilos.linha}>
          {Array.from({ length: colunas }).map((_, j) => (
            <Skeleton
              key={j}
              className={estilos.celula}
              // Varia a largura das células para parecer mais natural
              style={{ maxWidth: j === 0 ? '28%' : j === colunas - 1 ? '20%' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Skeleton de cards de estatística (Dashboard / Financeiro). */
export function CardsSkeleton({ quantidade = 4 }: { quantidade?: number }) {
  return (
    <div className={estilos.gradeCards}>
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className={estilos.cardEstat}>
          <Skeleton className={estilos.iconeCard} />
          <div className={estilos.textoCard}>
            <Skeleton className={estilos.linhaCurta} />
            <Skeleton className={estilos.linhaLonga} />
          </div>
        </div>
      ))}
    </div>
  );
}

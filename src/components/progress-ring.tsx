interface ProgressRingProps {
  value: number;
  total: number;
  size?: number;
  stroke?: number;
}

/** Anillo de progreso SVG con valor central (diseño StreamCRM). */
export function ProgressRing({ value, total, size = 132, stroke = 13 }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? value / total : 0;

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)',
        }}
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        className="fill-foreground text-[30px] font-extrabold tracking-tight"
      >
        {value}
      </text>
      <text x="50%" y="63%" textAnchor="middle" className="fill-muted-foreground text-xs font-semibold">
        de {total}
      </text>
    </svg>
  );
}

const AV_COLORS = ['#4f46e5', '#0ea5a3', '#db2777', '#ea580c', '#2563eb', '#7c3aed', '#16a34a', '#d97706'];

/** Iniciales (máx. 2) de un nombre completo: `Ana María Pérez` → `AM`. */
export function iniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface InitialsAvatarProps {
  name: string;
  size?: number;
}

/** Avatar con iniciales y color derivado del nombre (diseño StreamCRM). */
export function InitialsAvatar({ name, size = 38 }: InitialsAvatarProps) {
  let h = 0;
  for (const c of name) {
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  }
  const col = AV_COLORS[h % AV_COLORS.length];

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-extrabold tracking-tight"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `color-mix(in srgb, ${col} 16%, white)`,
        color: col,
        boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${col} 28%, transparent)`,
      }}
    >
      {iniciales(name)}
    </span>
  );
}

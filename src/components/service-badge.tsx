import { platformVisual } from '@/lib/platform-visual';

export interface ServiceRef {
  id: string;
  name: string;
}

interface ServiceBadgeProps {
  name: string;
  size?: number;
  className?: string;
}

/**
 * Cuadrito de color con las iniciales de un servicio real (plataforma).
 * El color y las iniciales se derivan del nombre de forma determinista.
 */
export function ServiceBadge({ name, size = 28, className = '' }: ServiceBadgeProps) {
  const { color, short } = platformVisual(name);

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg font-extrabold tracking-tight text-white ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: color,
        boxShadow: `0 2px 6px color-mix(in srgb, ${color} 30%, transparent)`,
      }}
      title={name}
    >
      {short}
    </span>
  );
}

interface ServiceStackProps {
  services: ServiceRef[];
  max?: number;
}

/** Pila de badges de servicios superpuestos (para filas de tabla). */
export function ServiceStack({ services, max = 4 }: ServiceStackProps) {
  if (services.length === 0) {
    return <span className="text-input">—</span>;
  }
  return (
    <div className="flex items-center">
      {services.slice(0, max).map((service, i) => (
        <ServiceBadge
          key={service.id}
          name={service.name}
          size={24}
          className={`ring-card rounded-[7px] ring-2 ${i > 0 ? '-ml-1.5' : ''}`}
        />
      ))}
      {services.length > max && (
        <span className="text-muted-foreground ml-1.5 text-xs font-bold">+{services.length - max}</span>
      )}
    </div>
  );
}

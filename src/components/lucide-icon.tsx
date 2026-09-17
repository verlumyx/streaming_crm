import { createElement } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarClock,
  ChartColumn,
  Circle,
  Clapperboard,
  Contact,
  KeyRound,
  LayoutGrid,
  LibraryBig,
  ListChecks,
  LogOut,
  MessagesSquare,
  NotebookPen,
  Package,
  PieChart,
  Scale,
  Radio,
  Settings,
  ShoppingCart,
  Undo2,
  UserCheck,
  Users,
  type LucideIcon as LucideIconComponent,
} from 'lucide-react';

/**
 * Mapa estático de los iconos que puede referenciar el menú (registro en BD).
 * Evita importar todo `lucide-react` de forma dinámica.
 */
export const MENU_ICONS = {
  LayoutGrid,
  Contact,
  LibraryBig,
  Clapperboard,
  Package,
  Boxes,
  KeyRound,
  ShoppingCart,
  NotebookPen,
  Undo2,
  ChartColumn,
  ArrowLeftRight,
  Scale,
  PieChart,
  CalendarClock,
  UserCheck,
  Users,
  Building2,
  Settings,
  Bot,
  Radio,
  BookOpen,
  MessagesSquare,
  ListChecks,
  LogOut,
} as const satisfies Record<string, LucideIconComponent>;

export type MenuIconName = keyof typeof MENU_ICONS;

export function isMenuIconName(name: string): name is MenuIconName {
  return Object.prototype.hasOwnProperty.call(MENU_ICONS, name);
}

/** Resuelve un icono por nombre; usa `Circle` como fallback. */
export function resolveMenuIcon(name: string | null | undefined): LucideIconComponent {
  return name && isMenuIconName(name) ? MENU_ICONS[name] : Circle;
}

interface LucideIconProps {
  name: string | null | undefined;
  className?: string;
}

export function LucideIcon({ name, className }: LucideIconProps) {
  return createElement(resolveMenuIcon(name), { className });
}

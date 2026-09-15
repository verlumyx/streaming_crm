import { SYSTEM_OWNER_PERMISSION, type MenuSection } from '@/modules/menu/models/menu.model';

export type MenuDefinition = {
  /** Fixed UUID so the seed is idempotent. */
  id: string;
  parentId: string | null;
  title: string;
  /** Relative to the company (`/clients`); the sidebar prepends `/{companyId}`. */
  url: string | null;
  /** Permission action, `system_owner`, or null (always visible). */
  permission: string | null;
  /** Lucide icon name (see `src/components/lucide-icon.tsx`). */
  icon: string;
  order: number;
  section: MenuSection;
};

const CATALOG_ID = '019e8a10-0001-7000-a000-000000000001';
const REPORTS_ID = '019e8a10-0004-7000-a000-000000000004';

/** Sidebar entries (single source of truth). Merge of the original SQL seed and MenuSeeder. */
export const MENU_REGISTRY: readonly MenuDefinition[] = [
  // main
  { id: '019cf226-1284-73f5-9291-d4615db63499', parentId: null, title: 'Dashboard', url: '/dashboard', permission: null, icon: 'LayoutGrid', order: 1, section: 'main' },
  { id: '019e7fa4-43bb-7208-ae00-65a4bef96502', parentId: null, title: 'Clientes', url: '/clients', permission: 'clients.list', icon: 'Contact', order: 2, section: 'main' },
  { id: CATALOG_ID, parentId: null, title: 'Catálogo', url: '/services', permission: 'services.list', icon: 'LibraryBig', order: 3, section: 'main' },
  { id: '019e8a10-0002-7000-a000-000000000002', parentId: CATALOG_ID, title: 'Servicios', url: '/services', permission: 'services.list', icon: 'Clapperboard', order: 1, section: 'main' },
  { id: '019e8a10-0003-7000-a000-000000000003', parentId: CATALOG_ID, title: 'Planes', url: '/plans', permission: 'plans.list', icon: 'Package', order: 2, section: 'main' },
  { id: '019ec417-c71d-7115-bf42-4aa300399ff6', parentId: null, title: 'Cuentas', url: '/accounts', permission: 'accounts.list', icon: 'KeyRound', order: 4, section: 'main' },
  { id: '019e8a10-0005-7000-a000-000000000005', parentId: null, title: 'Ventas', url: '/sales', permission: 'sales.list', icon: 'ShoppingCart', order: 5, section: 'main' },
  { id: '019e8a10-0006-7000-a000-000000000006', parentId: null, title: 'Reembolsos', url: '/refunds', permission: 'refunds.list', icon: 'Undo2', order: 6, section: 'main' },
  { id: '019e8a10-0007-7000-a000-000000000007', parentId: null, title: 'Transacciones manuales', url: '/manual-transactions', permission: 'manual-transactions.list', icon: 'NotebookPen', order: 7, section: 'main' },
  { id: REPORTS_ID, parentId: null, title: 'Reportes', url: '/reports/movements', permission: 'reports.movements', icon: 'ChartColumn', order: 8, section: 'main' },
  { id: '019e8a10-0008-7000-a000-000000000008', parentId: REPORTS_ID, title: 'Movimientos', url: '/reports/movements', permission: 'reports.movements', icon: 'ArrowLeftRight', order: 1, section: 'main' },
  { id: '019e8a10-0009-7000-a000-000000000009', parentId: REPORTS_ID, title: 'Ingresos y Gastos', url: '/reports/income-expenses', permission: 'reports.income_expenses', icon: 'Scale', order: 2, section: 'main' },
  { id: '019e8a10-000a-7000-a000-00000000000a', parentId: REPORTS_ID, title: 'Servicio / Plan', url: '/reports/service-plan', permission: 'reports.service_plan', icon: 'PieChart', order: 3, section: 'main' },
  { id: '019e8a10-000b-7000-a000-00000000000b', parentId: REPORTS_ID, title: 'Vencimientos', url: '/reports/expirations', permission: 'reports.expirations', icon: 'CalendarClock', order: 4, section: 'main' },
  // footer
  { id: '019cf226-1285-723c-ba82-f582cf993210', parentId: null, title: 'Usuarios', url: '/users', permission: 'users.list', icon: 'UserCheck', order: 1, section: 'footer' },
  { id: '019cf226-1285-723c-ba82-f582d08b1c08', parentId: null, title: 'Roles', url: '/roles', permission: 'roles.list', icon: 'Users', order: 2, section: 'footer' },
  { id: 'a14ea90e-9177-47d7-ba5e-ff768d0ad6fa', parentId: null, title: 'Empresas', url: '/companies', permission: SYSTEM_OWNER_PERMISSION, icon: 'Building2', order: 3, section: 'footer' },
];

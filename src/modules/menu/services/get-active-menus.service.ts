import 'server-only';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db/client';
import { menus, SYSTEM_OWNER_PERMISSION, type MenuRow, type MenuSection } from '@/modules/menu/models/menu.model';

export type MenuItem = {
  id: string;
  title: string;
  icon: string;
  /** Absolute URL (already prefixed with `/{companyId}`), or null for pure groups. */
  url: string | null;
  permission: string | null;
  children: MenuItem[];
};

export type MenuTree = { mainNavItems: MenuItem[]; footerNavItems: MenuItem[] };

type Viewer = { isSystemOwner: boolean; permissions: string[]; hasAllPermissions: boolean };

/**
 * Active sidebar entries, filtered by the viewer's permissions (roots only — children ride along with their parent),
 * with URLs prefixed by the company id.
 */
export class GetActiveMenusService {
  /** `prefixUrls: false` keeps raw urls (`/services`) for the mobile API. */
  async execute(companyId: string, viewer: Viewer, options: { prefixUrls?: boolean } = {}): Promise<MenuTree> {
    const prefix = options.prefixUrls === false ? null : companyId;
    const [main, footer] = await Promise.all([this.roots('main'), this.roots('footer')]);
    return {
      mainNavItems: this.filter(main, viewer).map((m) => this.serialize(m, prefix)),
      footerNavItems: this.filter(footer, viewer).map((m) => this.serialize(m, prefix)),
    };
  }

  private async roots(section: MenuSection) {
    return db.query.menus.findMany({
      where: and(eq(menus.isActive, true), eq(menus.section, section), isNull(menus.parentId)),
      orderBy: [asc(menus.order)],
      with: { children: { where: eq(menus.isActive, true), orderBy: [asc(menus.order)] } },
    });
  }

  private filter<T extends MenuRow>(items: T[], viewer: Viewer): T[] {
    return items.filter((m) => {
      if (!m.permission) return true;
      if (m.permission === SYSTEM_OWNER_PERMISSION) return viewer.isSystemOwner;
      if (viewer.hasAllPermissions) return true;
      return viewer.permissions.includes(m.permission);
    });
  }

  private serialize(row: MenuRow & { children?: MenuRow[] }, companyId: string | null): MenuItem {
    return {
      id: row.id,
      title: row.title,
      icon: row.icon,
      url: row.url ? (companyId ? `/${companyId}${row.url}` : row.url) : null,
      permission: row.permission,
      children: (row.children ?? []).map((c) => this.serialize(c, companyId)),
    };
  }
}

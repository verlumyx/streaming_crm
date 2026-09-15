import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/app-logo';
import { NavMain } from './NavMain';
import { NavFooter } from './NavFooter';
import { NavUser } from './NavUser';
import type { MenuTree } from '@/modules/menu/services/get-active-menus.service';

export function AppSidebar({ menus }: { menus: MenuTree }) {
  const dashboardUrl = menus.mainNavItems.find((m) => m.title === 'Dashboard')?.url ?? '/dashboard';

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={dashboardUrl} prefetch>
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={menus.mainNavItems} />
      </SidebarContent>

      <SidebarFooter>
        <NavFooter items={menus.footerNavItems} />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}

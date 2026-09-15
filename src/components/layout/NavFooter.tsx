'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { LucideIcon } from '@/components/lucide-icon';
import type { MenuItem } from '@/modules/menu/services/get-active-menus.service';

export function NavFooter({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  if (items.length === 0) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:p-0">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                asChild
                isActive={Boolean(item.url && pathname.startsWith(item.url))}
                tooltip={item.title}
                className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                <Link href={item.url ?? '#'} prefetch>
                  <LucideIcon name={item.icon} />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

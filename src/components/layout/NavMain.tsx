'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { LucideIcon } from '@/components/lucide-icon';
import type { MenuItem } from '@/modules/menu/services/get-active-menus.service';

function isActive(pathname: string, item: MenuItem): boolean {
  if (item.url && (pathname === item.url || pathname.startsWith(`${item.url}/`))) return true;
  return item.children.some((c) => isActive(pathname, c));
}

export function NavMain({ items }: { items: MenuItem[] }) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <SidebarGroup className="px-2 py-0">
      <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const active = isActive(pathname, item);

          if (item.children.length === 0) {
            return (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link href={item.url ?? '#'} prefetch>
                    <LucideIcon name={item.icon} />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          if (collapsed) {
            return (
              <SidebarMenuItem key={item.id}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton isActive={active} tooltip={item.title}>
                      <LucideIcon name={item.icon} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                    {item.children.map((child) => (
                      <DropdownMenuItem key={child.id} asChild>
                        <Link href={child.url ?? '#'}>
                          <LucideIcon name={child.icon} />
                          {child.title}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible key={item.id} asChild defaultOpen={active} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton isActive={active} tooltip={item.title}>
                    <LucideIcon name={item.icon} />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.id}>
                        <SidebarMenuSubButton asChild isActive={isActive(pathname, child)}>
                          <Link href={child.url ?? '#'} prefetch>
                            <LucideIcon name={child.icon} />
                            <span>{child.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

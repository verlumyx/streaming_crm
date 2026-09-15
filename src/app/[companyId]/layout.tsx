import { cookies } from 'next/headers';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { FlashToaster } from '@/modules/shared/flash/FlashToaster';
import { readFlash } from '@/modules/shared/flash/flash';
import { requireCompanyAccess } from '@/modules/shared/auth/require-company-access';
import { getUserPermissions } from '@/modules/shared/auth/require-permission';
import { getAccessibleCompanies } from '@/modules/shared/auth/membership';
import { CompanyProvider, type CompanyContextValue } from '@/modules/shared/auth/company-context';
import { GetActiveMenusService } from '@/modules/menu/services/get-active-menus.service';

type Props = { children: React.ReactNode; params: Promise<{ companyId: string }> };

export default async function CompanyLayout({ children, params }: Props) {
  const { companyId } = await params;
  const { user, membership, company } = await requireCompanyAccess(companyId);

  const [permissions, companiesList, flash, cookieStore] = await Promise.all([
    getUserPermissions(companyId),
    getAccessibleCompanies(user.id, Boolean(user.isSystemOwner)),
    readFlash(),
    cookies(),
  ]);

  const menus = await new GetActiveMenusService().execute(companyId, {
    isSystemOwner: Boolean(user.isSystemOwner),
    permissions,
    hasAllPermissions: membership.role?.permissionType === 'all',
  });

  const sidebarCookie = cookieStore.get('sidebar_state')?.value;
  const sidebarOpen = sidebarCookie === undefined || sidebarCookie === 'true';

  const context: CompanyContextValue = {
    companyId,
    companyName: company.name,
    user: { id: user.id, name: user.name, email: user.email, isSystemOwner: Boolean(user.isSystemOwner) },
    permissions,
    companies: companiesList.map((c) => ({ id: c.id, name: c.name, status: c.status })),
    defaultCompanyId: companiesList.find((c) => c.isDefault)?.id ?? null,
  };

  return (
    <CompanyProvider value={context}>
      <SidebarProvider defaultOpen={sidebarOpen}>
        <AppSidebar menus={menus} />
        <SidebarInset>
          <AppHeader />
          <main className="flex flex-1 flex-col">{children}</main>
        </SidebarInset>
      </SidebarProvider>
      <FlashToaster flash={flash} />
    </CompanyProvider>
  );
}

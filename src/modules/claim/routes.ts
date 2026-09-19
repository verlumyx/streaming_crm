import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/claims`;

export const claimRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  create: (companyId: string, query?: { clientId?: string }) => withQuery(`${base(companyId)}/create`, query),
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
  edit: (companyId: string, id: string) => `${base(companyId)}/${id}/edit`,
};

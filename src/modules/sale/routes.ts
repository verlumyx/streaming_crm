import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/sales`;

export const saleRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  create: (companyId: string, query?: { client?: string }) => withQuery(`${base(companyId)}/create`, query),
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
};

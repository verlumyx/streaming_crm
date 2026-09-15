import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/services`;

export const serviceRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
};

import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

/** Companies are global, but their pages live under the active company segment. */
const base = (companyId: string) => `/${companyId}/companies`;

export const companyRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  create: (companyId: string) => `${base(companyId)}/create`,
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
  edit: (companyId: string, id: string) => `${base(companyId)}/${id}/edit`,
};

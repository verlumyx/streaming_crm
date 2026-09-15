import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/users`;

export const userRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  create: (companyId: string) => `${base(companyId)}/create`,
  show: (companyId: string, id: string) => `${base(companyId)}/${id}`,
  edit: (companyId: string, id: string) => `${base(companyId)}/${id}/edit`,
};

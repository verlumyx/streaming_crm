import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/refunds`;

export const refundRoutes = {
  index: (companyId: string, query?: RouteQuery) => withQuery(base(companyId), query),
  create: (companyId: string) => `${base(companyId)}/create`,
  /** `{ edit: 1 }` opens the inline edit form (there is no edit page). */
  show: (companyId: string, id: string, query?: { edit?: 1 }) => withQuery(`${base(companyId)}/${id}`, query),
};

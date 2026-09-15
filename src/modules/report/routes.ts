import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

const base = (companyId: string) => `/${companyId}/reports`;

export const reportRoutes = {
  movements: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/movements`, query),
  incomeExpenses: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/income-expenses`, query),
  servicePlan: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/service-plan`, query),
  expirations: (companyId: string, query?: RouteQuery) => withQuery(`${base(companyId)}/expirations`, query),
};

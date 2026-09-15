import { withQuery, type RouteQuery } from '@/modules/shared/routes/with-query';

/** Public routes (no company segment). */
export const leadRoutes = {
  contact: (query?: RouteQuery) => withQuery('/contact', query),
};

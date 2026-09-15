export type RouteQuery = Record<string, string | number | boolean | undefined | null>;

/** Appends a query string, skipping empty values. Used by every module's `routes.ts`. */
export function withQuery(path: string, query?: RouteQuery): string {
  if (!query) return path;
  const qs = new URLSearchParams(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `${path}?${qs}` : path;
}

/** Builds a `FormData` like the browser would submit it (every value is a string). */
export function formData(values: Record<string, string | number | null | undefined>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) data.set(key, String(value));
  }
  return data;
}

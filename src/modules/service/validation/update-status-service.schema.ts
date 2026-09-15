import { z } from 'zod';

/** Accepts a real boolean or its form/query spelling (`'true'`/`'false'`/`'1'`/`'0'`). */
const toBoolean = (value: unknown) => {
  if (value === true || value === 'true' || value === '1' || value === 1) return true;
  if (value === false || value === 'false' || value === '0' || value === 0) return false;
  return value;
};

/** Actualizar Estado: a service is toggled through its `active` flag. */
export const updateStatusServiceSchema = z.object({
  active: z.preprocess(toBoolean, z.boolean({ message: 'El estado no es válido.' })),
});

export type UpdateStatusServiceInput = z.infer<typeof updateStatusServiceSchema>;

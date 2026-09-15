import { z } from 'zod';

const blankToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/** Monto de un reembolso: obligatorio, ≥ 0,01 y dentro de `numeric(10, 2)`. */
export const refundAmount = () =>
  z.preprocess(
    blankToUndefined,
    z
      .number({ message: 'El monto es obligatorio.' })
      .finite('El monto es obligatorio.')
      .min(0.01, 'El monto debe ser mayor a 0.')
      .max(99_999_999.99, 'El monto es demasiado alto.'),
  );

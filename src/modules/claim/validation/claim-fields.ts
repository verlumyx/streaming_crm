import { z } from 'zod';
import { CLAIM_CHANNELS } from '../models/claim.model';

export const CLAIM_DESCRIPTION_MAX = 2000;
export const CLAIM_RESOLUTION_NOTES_MAX = 2000;

/** Canal de origen del reclamo. Si el formulario no lo envía se asume `other`. */
export const claimChannel = () => z.enum(CLAIM_CHANNELS, { message: 'El canal no es válido.' }).default('other');

/** Cliente del reclamo: obligatorio y con mensaje propio (el select envía `''` cuando no hay selección). */
export const claimClientId = () =>
  z
    .string({ message: 'El cliente es obligatorio.' })
    .trim()
    .min(1, 'El cliente es obligatorio.')
    .pipe(z.uuid({ message: 'El cliente no existe.' }));

/**
 * Notas de resolución: ausente → `undefined` (no se toca lo guardado),
 * `''` → `null` (se limpia), texto → texto. Permite que el listado cambie
 * el estado sin borrar las notas escritas desde el detalle.
 */
export const claimResolutionNotes = () =>
  z
    .string()
    .trim()
    .max(CLAIM_RESOLUTION_NOTES_MAX, `Las notas de resolución no pueden superar ${CLAIM_RESOLUTION_NOTES_MAX} caracteres.`)
    .optional()
    .transform((value) => (value === undefined ? undefined : value === '' ? null : value));

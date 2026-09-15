import { z } from 'zod';

/** `POST /api/login` body. Field names keep the mobile API contract (`device_name`). */
export const loginSchema = z.object({
  email: z
    .string({ message: 'El correo es obligatorio.' })
    .trim()
    .min(1, 'El correo es obligatorio.')
    .pipe(z.email({ message: 'El correo no es válido.' })),
  password: z.string({ message: 'La contraseña es obligatoria.' }).min(1, 'La contraseña es obligatoria.'),
  device_name: z
    .string()
    .trim()
    .max(255, 'El nombre del dispositivo no puede superar 255 caracteres.')
    .nullish()
    .transform((v) => (v ? v : 'mobile')),
});

export type LoginInput = z.infer<typeof loginSchema>;

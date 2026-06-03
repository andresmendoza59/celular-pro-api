import { z } from 'zod'

export const registerDto = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export const loginDto = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

export type RegisterDto = z.infer<typeof registerDto>
export type LoginDto = z.infer<typeof loginDto>

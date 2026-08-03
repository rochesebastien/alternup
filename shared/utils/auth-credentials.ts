import { z } from 'zod'
import { Role } from '~/shared/utils/enums'

const email = z
  .string({ error: 'L\'adresse e-mail est requise.' })
  .trim()
  .toLowerCase()
  .email('Adresse e-mail invalide.')

const name = z
  .string({ error: 'Ce champ est requis.' })
  .trim()
  .min(1, 'Ce champ est requis.')
  .max(120, '120 caractères maximum.')

export const registerInputSchema = z.object({
  email,
  password: z
    .string({ error: 'Le mot de passe est requis.' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  firstName: name,
  lastName: name,
  role: z.nativeEnum(Role).default(Role.Alternant)
})

export const loginInputSchema = z.object({
  email,
  password: z
    .string({ error: 'Le mot de passe est requis.' })
    .min(1, 'Le mot de passe est requis.')
})

export type RegisterInput = z.input<typeof registerInputSchema>
export type LoginInput = z.input<typeof loginInputSchema>

export type ValidationIssue = { path: string; message: string }

export function formatZodIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message
  }))
}

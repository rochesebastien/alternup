import { z } from 'zod'
import { Role } from '@prisma/client'

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email()

const name = z.string().trim().min(1, 'Required').max(120)

export const registerInputSchema = z.object({
  email,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: name,
  lastName: name,
  role: z.nativeEnum(Role).default(Role.Alternant)
})

export const loginInputSchema = z.object({
  email,
  password: z.string().min(1)
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

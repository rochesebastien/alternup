import { z } from 'zod'

/**
 * Modification de son propre compte (page /account). Volontairement limité à
 * l'identité : l'email est l'identifiant de connexion et le rôle est décidé à
 * l'inscription / par le tuteur — ni l'un ni l'autre n'est modifiable ici.
 */
const name = z
  .string({ error: 'Ce champ est requis.' })
  .trim()
  .min(1, 'Ce champ est requis.')
  .max(120, '120 caractères maximum.')

export const accountProfileUpdateSchema = z.object({
  firstName: name,
  lastName: name
})

export const MIN_PASSWORD_LENGTH = 8

/**
 * Changement de mot de passe : l'actuel est exigé (le cookie de session ne
 * suffit pas à prouver qu'on est bien devant l'écran) et le nouveau doit être
 * confirmé pour éviter de se verrouiller sur une faute de frappe.
 */
export const accountPasswordUpdateSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Le mot de passe actuel est requis.' })
      .min(1, 'Le mot de passe actuel est requis.'),
    newPassword: z
      .string({ error: 'Le nouveau mot de passe est requis.' })
      .min(
        MIN_PASSWORD_LENGTH,
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`
      )
      .max(200, '200 caractères maximum.'),
    confirmPassword: z
      .string({ error: 'La confirmation est requise.' })
      .min(1, 'La confirmation est requise.')
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmPassword']
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: 'Le nouveau mot de passe doit être différent de l\'actuel.',
    path: ['newPassword']
  })

export type AccountProfileUpdateInput = z.input<typeof accountProfileUpdateSchema>
export type AccountPasswordUpdateInput = z.input<typeof accountPasswordUpdateSchema>

import { z } from 'zod'

/**
 * Rôles applicatifs, en littéraux de chaîne : ce module est partagé avec le client,
 * il ne doit jamais importer une valeur d'enum Prisma (crash d'hydratation).
 */
export const ALL_ROLES = ['Tutor', 'Alternant', 'Stagiaire'] as const
export type ProfileRole = (typeof ALL_ROLES)[number]

/** Rôles qu'un tuteur peut créer et administrer dans son réseau (jamais `Tutor`). */
export const LEARNER_ROLES = ['Alternant', 'Stagiaire'] as const
export type LearnerRole = (typeof LEARNER_ROLES)[number]

export function isLearnerRole(role: string): role is LearnerRole {
  return (LEARNER_ROLES as readonly string[]).includes(role)
}

const email = z
  .string({ error: "L'adresse e-mail est requise." })
  .trim()
  .toLowerCase()
  .email('Adresse e-mail invalide.')

const name = z
  .string({ error: 'Ce champ est requis.' })
  .trim()
  .min(1, 'Ce champ est requis.')
  .max(120, '120 caractères maximum.')

/** Filtre optionnel de la liste des profils (la portée reste le réseau du tuteur). */
export const profileListQuerySchema = z.object({
  role: z.enum(ALL_ROLES).optional()
})

/**
 * Création d'un compte par un tuteur. Le rôle est volontairement borné aux rôles
 * apprenants : aucune route ne doit permettre de fabriquer un compte `Tutor`.
 */
export const profileCreateSchema = z.object({
  email,
  password: z
    .string({ error: 'Le mot de passe est requis.' })
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères.'),
  firstName: name,
  lastName: name,
  role: z.enum(LEARNER_ROLES).default('Alternant')
})

/** Mise à jour d'un profil : le rôle n'est jamais modifiable via cette route. */
export const profileUpdateSchema = z
  .object({
    email: email.optional(),
    firstName: name.optional(),
    lastName: name.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni.'
  })

export type ProfileListQuery = z.input<typeof profileListQuerySchema>
export type ProfileCreateInput = z.input<typeof profileCreateSchema>
export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>

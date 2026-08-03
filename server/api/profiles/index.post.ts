import bcrypt from 'bcrypt'
import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { profileSelect } from '~/server/utils/profiles'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { profileCreateSchema } from '~/shared/utils/profiles'

export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = profileCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de profil invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { password, role, ...data } = parsed.data
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    // Le rôle est borné à Alternant|Stagiaire par le schéma, et le compte créé
    // est immédiatement rattaché au réseau du tuteur créateur.
    return await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...data, passwordHash, role: role as Role },
        select: profileSelect
      })
      await tx.tutorStudent.create({
        data: { tutorId: tutor.id, studentId: created.id }
      })
      return created
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette adresse e-mail est déjà utilisée.'
      })
    }
    throw err
  }
})

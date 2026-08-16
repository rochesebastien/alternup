import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import {
  assertCanRecordFor,
  dateFromKey,
  presenceEntryInclude,
  toPresenceEntry
} from '~/server/utils/presence-entries'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { minutesFromTime, presenceEntryUpsertSchema } from '~/shared/utils/presence-entries'
import type { PresenceEntry } from '~/shared/utils/presence-entries'

const ALREADY_RECORDED
  = 'Votre pointage de cette journée est déjà enregistré. Demandez à votre tuteur de le corriger.'

/**
 * Pointage d'une journée. Re-pointer le même jour met à jour la ligne existante
 * (une seule journée déclarée par personne et par date) — sauf pour un
 * apprenant qui pointe pour lui-même : une fois créé, seul son tuteur peut le
 * corriger (anti-triche, voir `PresenceEntryRevision`).
 */
export default defineEventHandler(async (event): Promise<PresenceEntry> => {
  const user = await requireAuth(event)

  const parsed = presenceEntryUpsertSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de pointage invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { date, startTime, endTime, kind } = parsed.data
  const studentId = parsed.data.studentId ?? user.id
  const isLearner = user.role !== Role.Tutor

  // Un tuteur ne pointe pas ses propres journées : la ligne serait invisible
  // dans son journal (filtré sur ses apprenants) et impossible à supprimer.
  if (!isLearner && studentId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Sélectionnez la personne dont vous pointez la journée.'
    })
  }

  await assertCanRecordFor(studentId, user)

  const day = dateFromKey(date)
  const startMinute = minutesFromTime(startTime)
  const endMinute = minutesFromTime(endTime)

  const existing = await prisma.presenceEntry.findUnique({
    where: { studentId_date: { studentId, date: day } },
    select: { id: true }
  })

  if (existing && isLearner) {
    throw createError({ statusCode: 403, statusMessage: ALREADY_RECORDED })
  }

  try {
    // Upsert + journal dans la même transaction : chaque écriture (création
    // comme modification) laisse une trace vérifiable par le tuteur. Le
    // `_count` de l'upsert est capturé AVANT l'insertion de la révision : on le
    // recompte donc explicitement après coup pour ne pas renvoyer un décompte
    // périmé (0 sur une création).
    const entry = await prisma.$transaction(async (tx) => {
      const saved = await tx.presenceEntry.upsert({
        where: { studentId_date: { studentId, date: day } },
        create: { studentId, date: day, startMinute, endMinute, kind, recordedById: user.id },
        update: { startMinute, endMinute, kind, recordedById: user.id },
        include: presenceEntryInclude
      })
      await tx.presenceEntryRevision.create({
        data: {
          entryId: saved.id,
          action: existing ? 'updated' : 'created',
          startMinute,
          endMinute,
          kind,
          changedById: user.id
        }
      })
      const revisions = await tx.presenceEntryRevision.count({ where: { entryId: saved.id } })
      return { ...saved, _count: { revisions } }
    })

    return toPresenceEntry(entry, user.id)
  } catch (err) {
    // Deux pointages simultanés du même jour : la lecture `existing` ci-dessus
    // n'est pas atomique, c'est la contrainte d'unicité qui tranche. L'apprenant
    // arrivé second doit voir le refus métier, pas une erreur 500.
    if (
      isLearner
      && err instanceof Prisma.PrismaClientKnownRequestError
      && err.code === 'P2002'
    ) {
      throw createError({ statusCode: 403, statusMessage: ALREADY_RECORDED })
    }
    throw err
  }
})

import { Role, type CompetencyLevel } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { COMPETENCY_LEVEL_SCORE, COMPETENCY_MAX_SCORE } from '~/shared/utils/competencies'

/** Charge un domaine appartenant au tuteur connecté. 404 sinon. */
export async function loadDomainOwnedBy(id: string, user: User) {
  const domain = await prisma.competencyDomain.findUnique({ where: { id } })
  if (!domain || user.role !== Role.Tutor || domain.tutorId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Domaine introuvable' })
  }
  return domain
}

/** Charge une compétence dont le domaine appartient au tuteur connecté. 404 sinon. */
export async function loadCompetencyOwnedBy(id: string, user: User) {
  const competency = await prisma.competency.findUnique({
    where: { id },
    include: { domain: { select: { tutorId: true } } }
  })
  if (!competency || user.role !== Role.Tutor || competency.domain.tutorId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Compétence introuvable' })
  }
  return competency
}

export interface CompetencyMap {
  domains: Array<{
    id: string
    label: string
    progress: number | null
    competencies: Array<{
      id: string
      label: string
      level: CompetencyLevel | null
      comment: string | null
    }>
  }>
  overall: number | null
}

/**
 * Construit la carte de compétences d'un étudiant à partir du référentiel d'un
 * tuteur : niveau le plus récent par compétence + progression par domaine (%).
 */
export async function studentCompetencyMap(
  studentId: string,
  tutorId: string
): Promise<CompetencyMap> {
  const [domains, assessments] = await Promise.all([
    prisma.competencyDomain.findMany({
      where: { tutorId },
      orderBy: { position: 'asc' },
      include: { competencies: { orderBy: { position: 'asc' } } }
    }),
    prisma.competencyAssessment.findMany({
      where: { studentId, competency: { domain: { tutorId } } },
      orderBy: { createdAt: 'desc' },
      select: { competencyId: true, level: true, comment: true }
    })
  ])

  // Niveau le plus récent par compétence (assessments déjà triés desc).
  const latest = new Map<string, { level: CompetencyLevel; comment: string | null }>()
  for (const a of assessments) {
    if (!latest.has(a.competencyId)) latest.set(a.competencyId, { level: a.level, comment: a.comment })
  }

  const allScores: number[] = []
  const mappedDomains = domains.map((d) => {
    const scores: number[] = []
    const competencies = d.competencies.map((c) => {
      const cur = latest.get(c.id) ?? null
      if (cur) {
        scores.push(COMPETENCY_LEVEL_SCORE[cur.level])
        allScores.push(COMPETENCY_LEVEL_SCORE[cur.level])
      }
      return { id: c.id, label: c.label, level: cur?.level ?? null, comment: cur?.comment ?? null }
    })
    const progress =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / COMPETENCY_MAX_SCORE) * 100)
        : null
    return { id: d.id, label: d.label, progress, competencies }
  })

  const overall =
    allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length / COMPETENCY_MAX_SCORE) * 100)
      : null

  return { domains: mappedDomains, overall }
}

import { z } from 'zod'
import { ReportStatus, Role, SignatureDocumentType, VisitStatus } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { isTutorOf } from '~/server/utils/network'
import { studentCompetencyMap } from '~/server/utils/competencies'
import { listSignaturesByDocument } from '~/server/utils/signatures'
import {
  buildSignatureParties,
  type DocumentSignatureView,
  type SignatureBlock
} from '~/shared/utils/signatures'
import { computeAttendanceSummary, type StudentLivret } from '~/shared/utils/livret'
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'

/** Snapshot vide servi quand la colonne Json est absente (bulletin ancien/corrompu). */
const EMPTY_SNAPSHOT: ReportCardSnapshot = {
  courses: [],
  overallAverage: null,
  attendance: { total: 0, present: 0, absent: 0, retard: 0, excuse: 0, rate: null }
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`
}

/**
 * Livret de l'alternant : compilation imprimable de tout ce qui a valeur
 * probante pour un financeur (bulletins publiés, rapports validés et leurs
 * signatures, carte de compétences, visites réalisées, bilan d'assiduité).
 *
 * Endpoint d'agrégation dédié plutôt qu'un empilement d'appels : les bulletins
 * et rapports d'un ÉTUDIANT donné ne sont exposés par aucune route de liste
 * côté tuteur, et les signatures doivent être jointes en lot (2 requêtes) au
 * lieu d'une par document.
 *
 * Réservé au tuteur, et uniquement pour un étudiant de SON réseau (404 sinon,
 * on ne divulgue pas l'existence). Le livret est bâti sur le référentiel et les
 * périodes de ce tuteur : deux tuteurs d'un même étudiant voient chacun le leur.
 */
export default defineEventHandler(async (event): Promise<StudentLivret> => {
  const user = await requireRole(event, Role.Tutor)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide.' })
  }
  const studentId = idp.data

  if (!(await isTutorOf(user.id, studentId))) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
  }

  const [student, tutor, link] = await Promise.all([
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true }
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, firstName: true, lastName: true }
    }),
    prisma.tutorStudent.findUnique({
      where: { tutorId_studentId: { tutorId: user.id, studentId } },
      select: { addedAt: true }
    })
  ])

  if (!student || !tutor) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
  }

  const [cards, reports, competencies, visits, attendances] = await Promise.all([
    prisma.reportCard.findMany({
      where: {
        studentId,
        publishedAt: { not: null },
        period: { tutorId: user.id }
      },
      orderBy: { publishedAt: 'asc' },
      select: {
        id: true,
        generalComment: true,
        snapshot: true,
        publishedAt: true,
        period: { select: { label: true, startDate: true, endDate: true } }
      }
    }),
    prisma.progressReport.findMany({
      where: { studentId, tutorId: user.id, status: ReportStatus.valide },
      orderBy: { periodEnd: 'asc' },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        body: true,
        difficulties: true,
        learnings: true,
        tutorFeedback: true,
        reviewedAt: true
      }
    }),
    studentCompetencyMap(studentId, user.id),
    prisma.tutorVisit.findMany({
      where: { studentId, tutorId: user.id, status: VisitStatus.realisee },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        scheduledAt: true,
        mode: true,
        location: true,
        summary: true,
        nextSteps: true
      }
    }),
    prisma.attendance.findMany({
      where: { event: { studentId, tutorId: user.id } },
      select: { status: true }
    })
  ])

  // Les deux parties sont les mêmes pour tous les documents du livret : ce
  // tuteur et cet étudiant.
  const parties = {
    tutor: { id: tutor.id, name: fullName(tutor) },
    student: { id: student.id, name: fullName(student) }
  }

  const [cardSignatures, reportSignatures] = await Promise.all([
    listSignaturesByDocument(
      SignatureDocumentType.bulletin,
      cards.map((card) => card.id)
    ),
    listSignaturesByDocument(
      SignatureDocumentType.rapport,
      reports.map((report) => report.id)
    )
  ])

  const block = (
    documentType: SignatureDocumentType,
    documentId: string,
    source: Map<string, DocumentSignatureView[]>
  ): SignatureBlock => ({
    documentType,
    documentId,
    // Un document présent dans le livret est publié/validé, donc signable.
    eligible: true,
    parties: buildSignatureParties(parties, source.get(documentId) ?? [])
  })

  return {
    generatedAt: new Date().toISOString(),
    student: {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      role: student.role,
      addedAt: link?.addedAt.toISOString() ?? null
    },
    tutor: {
      id: tutor.id,
      email: tutor.email,
      firstName: tutor.firstName,
      lastName: tutor.lastName
    },
    reportCards: cards.map((card) => ({
      id: card.id,
      periodLabel: card.period.label,
      periodStart: card.period.startDate.toISOString(),
      periodEnd: card.period.endDate.toISOString(),
      // `publishedAt` est non nul (filtré en SQL) — le `?? new Date()` ne sert
      // qu'à satisfaire le typage nullable de la colonne.
      publishedAt: (card.publishedAt ?? new Date()).toISOString(),
      generalComment: card.generalComment,
      snapshot: (card.snapshot as unknown as ReportCardSnapshot | null) ?? EMPTY_SNAPSHOT,
      signatures: block(SignatureDocumentType.bulletin, card.id, cardSignatures)
    })),
    reports: reports.map((report) => ({
      id: report.id,
      title: report.title,
      periodStart: report.periodStart.toISOString(),
      periodEnd: report.periodEnd.toISOString(),
      body: report.body,
      difficulties: report.difficulties,
      learnings: report.learnings,
      tutorFeedback: report.tutorFeedback,
      reviewedAt: report.reviewedAt?.toISOString() ?? null,
      signatures: block(SignatureDocumentType.rapport, report.id, reportSignatures)
    })),
    competencies: {
      domains: competencies.domains,
      overall: competencies.overall
    },
    visits: visits.map((visit) => ({
      id: visit.id,
      scheduledAt: visit.scheduledAt.toISOString(),
      mode: visit.mode,
      location: visit.location,
      summary: visit.summary,
      nextSteps: visit.nextSteps
    })),
    attendance: computeAttendanceSummary(attendances.map((row) => row.status as string))
  }
})

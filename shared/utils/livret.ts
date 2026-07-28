// Livret de l'alternant — contrat de la vue compilée et imprimable.
//
// Module PUR : aucune dépendance Prisma / runtime serveur (littéraux de chaîne
// et `import type` uniquement, cf. taches/lecons.md n°6). L'agrégation vit dans
// `server/api/users/[id]/livret.get.ts` ; ce fichier ne porte que le contrat de
// réponse et le calcul du bilan d'assiduité, testable sans base de données.

import type { CompetencyLevel } from '@prisma/client'
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'
import type { SignatureBlock } from '~/shared/utils/signatures'

// ─────────────────────────── Bilan d'assiduité ───────────────────────────

export interface AttendanceSummary {
  /** Nombre de sessions pointées. */
  total: number
  present: number
  absent: number
  retard: number
  excuse: number
  /** Taux de présence en % (présents + retards / total), `null` si aucun pointage. */
  rate: number | null
}

const EMPTY_SUMMARY: AttendanceSummary = {
  total: 0,
  present: 0,
  absent: 0,
  retard: 0,
  excuse: 0,
  rate: null
}

/**
 * Agrège des statuts de pointage en bilan d'assiduité. Un retard compte comme
 * une présence effective (l'alternant était là) : c'est la même convention que
 * le snapshot des bulletins, pour que les deux chiffres du livret concordent.
 * Les statuts inconnus sont comptés dans le total sans alimenter de compteur.
 */
export function computeAttendanceSummary(statuses: string[]): AttendanceSummary {
  if (statuses.length === 0) return { ...EMPTY_SUMMARY }

  const countOf = (status: string): number =>
    statuses.filter((candidate) => candidate === status).length

  const present = countOf('present')
  const retard = countOf('retard')

  return {
    total: statuses.length,
    present,
    absent: countOf('absent'),
    retard,
    excuse: countOf('excuse'),
    rate: Math.round(((present + retard) / statuses.length) * 100)
  }
}

// ─────────────────────────── Contrat de réponse ───────────────────────────

export interface LivretPerson {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface LivretStudent extends LivretPerson {
  role: string
  /** Date d'entrée dans le réseau du tuteur, `null` si le lien est introuvable. */
  addedAt: string | null
}

export interface LivretReportCard {
  id: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  publishedAt: string
  generalComment: string | null
  snapshot: ReportCardSnapshot
  signatures: SignatureBlock
}

export interface LivretProgressReport {
  id: string
  title: string
  periodStart: string
  periodEnd: string
  body: string
  difficulties: string | null
  learnings: string | null
  tutorFeedback: string | null
  reviewedAt: string | null
  signatures: SignatureBlock
}

export interface LivretCompetency {
  id: string
  label: string
  level: CompetencyLevel | null
  comment: string | null
}

export interface LivretCompetencyDomain {
  id: string
  label: string
  /** Progression du domaine en %, `null` si aucune compétence évaluée. */
  progress: number | null
  competencies: LivretCompetency[]
}

export interface LivretVisit {
  id: string
  scheduledAt: string
  mode: string | null
  location: string | null
  summary: string | null
  nextSteps: string | null
}

export interface StudentLivret {
  /** Date ISO de génération, imprimée en pied de livret. */
  generatedAt: string
  student: LivretStudent
  tutor: LivretPerson
  reportCards: LivretReportCard[]
  reports: LivretProgressReport[]
  competencies: {
    domains: LivretCompetencyDomain[]
    overall: number | null
  }
  visits: LivretVisit[]
  attendance: AttendanceSummary
}

// Énumérations du schéma Prisma, redéclarées ici pour le code partagé.
//
// Pourquoi ne pas les importer depuis `@prisma/client` ? Ce paquet est réservé
// au serveur. Dès qu'un fichier rendu côté navigateur (`app.vue`, `pages/`,
// `components/`, `shared/`) en importe une *valeur* (et non un simple type),
// Vite embarque `@prisma/client` dans le bundle client, qui échoue au chargement
// sur `Failed to resolve module specifier ".prisma/client/index-browser"`.
// L'hydratation de toute l'application casse alors silencieusement : plus aucun
// formulaire ne fonctionne, les menus déroulants ne s'ouvrent plus et les
// composants `<ClientOnly>` restent bloqués sur leur fallback.
//
// Ces constantes sont donc la source unique côté client. Elles restent
// assignables aux types Prisma correspondants, qui sont eux aussi des unions de
// littéraux de chaînes (`type Role = 'Tutor' | 'Alternant' | 'Stagiaire'`).
// Toute modification d'un `enum` dans `prisma/schema.prisma` doit être répercutée
// ici (et inversement).

export const Role = {
  Tutor: 'Tutor',
  Alternant: 'Alternant',
  Stagiaire: 'Stagiaire'
} as const
export type Role = (typeof Role)[keyof typeof Role]

export const ProjectStatus = {
  non_demarre: 'non_demarre',
  en_cours: 'en_cours',
  termine: 'termine',
  annule: 'annule'
} as const
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus]

export const AttendanceStatus = {
  present: 'present',
  absent: 'absent',
  retard: 'retard',
  excuse: 'excuse'
} as const
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus]

export const ReportStatus = {
  brouillon: 'brouillon',
  soumis: 'soumis',
  valide: 'valide',
  a_revoir: 'a_revoir'
} as const
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus]

export const VisitStatus = {
  planifiee: 'planifiee',
  realisee: 'realisee',
  annulee: 'annulee'
} as const
export type VisitStatus = (typeof VisitStatus)[keyof typeof VisitStatus]

export const CompetencyLevel = {
  decouverte: 'decouverte',
  en_cours: 'en_cours',
  acquis: 'acquis',
  maitrise: 'maitrise'
} as const
export type CompetencyLevel = (typeof CompetencyLevel)[keyof typeof CompetencyLevel]

export const SignatureDocumentType = {
  bulletin: 'bulletin',
  rapport: 'rapport'
} as const
export type SignatureDocumentType = (typeof SignatureDocumentType)[keyof typeof SignatureDocumentType]

export const OffreSourceType = {
  la_bonne_alternance: 'la_bonne_alternance'
} as const
export type OffreSourceType = (typeof OffreSourceType)[keyof typeof OffreSourceType]

export const OffreContratType = {
  apprentissage: 'apprentissage',
  professionnalisation: 'professionnalisation'
} as const
export type OffreContratType = (typeof OffreContratType)[keyof typeof OffreContratType]

export const OffreStatut = {
  active: 'active',
  expiree: 'expiree'
} as const
export type OffreStatut = (typeof OffreStatut)[keyof typeof OffreStatut]

export const CandidatureStatut = {
  vue: 'vue',
  candidate: 'candidate',
  rejetee: 'rejetee'
} as const
export type CandidatureStatut = (typeof CandidatureStatut)[keyof typeof CandidatureStatut]

export const ScrapeRunStatut = {
  en_cours: 'en_cours',
  succes: 'succes',
  erreur: 'erreur'
} as const
export type ScrapeRunStatut = (typeof ScrapeRunStatut)[keyof typeof ScrapeRunStatut]

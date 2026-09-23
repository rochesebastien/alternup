import type { Prisma } from '@prisma/client'
import type { ZodError } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { sessionUserSelect, toSessionUser } from '~/server/utils/session'
import { toOnboardingView } from '~/server/utils/onboarding'
import { inviteUrlFor, issueInvitation } from '~/server/utils/invitations'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import {
  answersForRole,
  onboardingActionsSchema,
  onboardingAnswersSchema,
  type OnboardingActionsResult,
  type OnboardingSubmitResult
} from '~/shared/utils/onboarding'

type ParsedActions = ReturnType<typeof onboardingActionsSchema.parse>

function toDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null
}

function invalid(message: string, error: ZodError) {
  return createError({ statusCode: 400, statusMessage: message, data: { issues: formatZodIssues(error) } })
}

/**
 * Actions de démarrage du tuteur : premier apprenant (invitation, ou
 * rattachement direct si le compte existe déjà) et point de suivi
 * hebdomadaire (événements de calendrier). Les événements visent l'apprenant
 * s'il a déjà un compte, sinon l'invitation : `register.post` les lui
 * rattache quand il crée son compte.
 */
async function runTutorActions(
  tx: Prisma.TransactionClient,
  tutorId: string,
  actions: ParsedActions
): Promise<{ result: OnboardingActionsResult; invitationToken: string | null }> {
  const result: OnboardingActionsResult = { invitation: null, suivi: null }
  let invitationToken: string | null = null
  let studentId: string | null = null
  let invitationId: string | null = null
  let learnerName: string | null = null

  if (actions.invitation) {
    const { email, firstName, lastName, role } = actions.invitation
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true, role: true, firstName: true, lastName: true }
    })
    if (existing && existing.role === 'Tutor') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette adresse appartient à un compte tuteur : elle ne peut pas être invitée comme apprenant.'
      })
    }
    if (existing) {
      await tx.tutorStudent.upsert({
        where: { tutorId_studentId: { tutorId, studentId: existing.id } },
        create: { tutorId, studentId: existing.id },
        update: {}
      })
      studentId = existing.id
      learnerName = `${existing.firstName} ${existing.lastName}`
      result.invitation = { kind: 'linked', firstName: existing.firstName, lastName: existing.lastName }
    } else {
      const invitation = await issueInvitation(tx, tutorId, { email, firstName, lastName, role })
      invitationId = invitation.id
      invitationToken = invitation.token
      learnerName = [firstName, lastName].filter(Boolean).join(' ') || null
      // `inviteUrl` est complété par le handler (il connaît l'origine de la requête).
      result.invitation = { kind: 'invited', email, firstName: firstName ?? null, inviteUrl: '' }
    }
  }

  if (actions.suivi) {
    const slots = [...actions.suivi.slots].sort((a, b) => a.startTime.localeCompare(b.startTime))
    const title = learnerName ? `Point de suivi hebdomadaire · ${learnerName}` : 'Point de suivi hebdomadaire'
    await tx.calendarEvent.createMany({
      data: slots.map((slot) => ({
        tutorId,
        studentId,
        invitationId,
        title,
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime)
      }))
    })
    result.suivi = {
      count: slots.length,
      firstStart: slots[0]!.startTime,
      lastStart: slots[slots.length - 1]!.startTime
    }
  }

  return { result, invitationToken }
}

/**
 * Fin du questionnaire d'onboarding : enregistre (ou remplace) les réponses,
 * marque l'onboarding terminé et réécrit la session pour que le middleware
 * laisse passer sans reconnexion. Refaire le questionnaire depuis « Mon
 * compte » repasse par ici ; les actions du tuteur, elles, ne s'exécutent qu'à
 * la première complétion, même après un « Compléter plus tard » (sinon chaque passage dupliquerait invitation et
 * rendez-vous).
 */
export default defineEventHandler(async (event): Promise<OnboardingSubmitResult> => {
  const current = await requireAuth(event)
  const body = (await readBody(event)) ?? {}

  const parsed = onboardingAnswersSchema.safeParse(body)
  if (!parsed.success) throw invalid('Réponses invalides.', parsed.error)

  const parsedActions = onboardingActionsSchema.safeParse(body.actions)
  if (!parsedActions.success) throw invalid('Actions invalides.', parsedActions.error)
  // Première complétion seulement (y compris après « Compléter plus tard »).
  const runActions = current.role === 'Tutor' && current.onboarding !== 'done'

  const answers = answersForRole(current.role, parsed.data)
  const data = {
    ...answers,
    dateDebutContrat: toDate(answers.dateDebutContrat),
    dateFinContrat: toDate(answers.dateFinContrat)
  }

  const { profile, user, actions, invitationToken } = await prisma.$transaction(async (tx) => {
    const profile = await tx.onboardingProfile.upsert({
      where: { userId: current.id },
      create: { userId: current.id, ...data },
      update: data
    })
    const { result, invitationToken } = runActions
      ? await runTutorActions(tx, current.id, parsedActions.data)
      : { result: { invitation: null, suivi: null }, invitationToken: null }
    const user = await tx.user.update({
      where: { id: current.id },
      data: { onboardingCompletedAt: new Date() },
      select: sessionUserSelect
    })
    return { profile, user, actions: result, invitationToken }
  })

  if (actions.invitation?.kind === 'invited' && invitationToken) {
    actions.invitation.inviteUrl = inviteUrlFor(event, invitationToken)
  }

  await setUserSession(event, { user: toSessionUser(user) })
  return { profile: toOnboardingView(profile), actions }
})

import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

const projectIncludeOwner = {
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true }
  }
} as const

export async function loadProjectVisibleTo(id: string, user: User) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      ...projectIncludeOwner,
      assignments: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          updates: {
            orderBy: { createdAt: 'desc' },
            include: {
              author: { select: { id: true, firstName: true, lastName: true, role: true } }
            }
          }
        }
      }
    }
  })
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }

  const visible =
    project.createdById === user.id ||
    project.assignments.some((a) => a.studentId === user.id)

  if (!visible) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }
  return project
}

export async function loadProjectOwnedBy(id: string, user: User) {
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Projet introuvable.' })
  }
  if (project.createdById !== user.id) {
    throw createError({ statusCode: 403, statusMessage: 'Accès refusé.' })
  }
  return project
}

export async function loadAssignmentVisibleTo(id: string, user: User) {
  const assignment = await prisma.projectAssignment.findUnique({
    where: { id },
    include: {
      project: { include: projectIncludeOwner },
      student: { select: { id: true, firstName: true, lastName: true, email: true } }
    }
  })
  if (!assignment) {
    throw createError({ statusCode: 404, statusMessage: 'Affectation introuvable.' })
  }
  const isTutorOwner = assignment.project.createdById === user.id
  const isStudent = assignment.studentId === user.id
  if (!isTutorOwner && !isStudent) {
    throw createError({ statusCode: 404, statusMessage: 'Affectation introuvable.' })
  }
  return assignment
}

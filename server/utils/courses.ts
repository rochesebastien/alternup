import { Prisma, Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

export function notionsToPrismaInput(
  value: string[] | null | undefined
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.DbNull
  return value
}

export async function assertTutorOwnsLearner(
  tutor: User,
  studentId: string
): Promise<void> {
  if (tutor.role !== Role.Tutor) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: tutor.id, studentId } }
  })
  if (!relation) {
    throw createError({ statusCode: 403, statusMessage: 'Learner is not in your network' })
  }
}

export async function loadCalendarEventVisibleTo(id: string, user: User) {
  const event = await prisma.calendarEvent.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      tutor: { select: { id: true, firstName: true, lastName: true, email: true } },
      courseAssignment: {
        include: {
          course: { select: { id: true, title: true } }
        }
      }
    }
  })
  if (!event) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }
  const isOwner = event.tutorId === user.id || event.studentId === user.id
  if (!isOwner) {
    throw createError({ statusCode: 404, statusMessage: 'Event not found' })
  }
  return event
}

export async function loadCourseNoteVisibleTo(id: string, user: User) {
  const note = await prisma.courseNote.findUnique({
    where: { id },
    include: {
      assignment: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          course: { select: { id: true, title: true } }
        }
      }
    }
  })
  if (!note) {
    throw createError({ statusCode: 404, statusMessage: 'Note not found' })
  }
  await assertCanReadAssignment(user, note.assignment.studentId)
  return note
}

export async function assertCanReadAssignment(
  user: User,
  studentId: string
): Promise<void> {
  if (user.id === studentId) return
  if (user.role !== Role.Tutor) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
  const relation = await prisma.tutorStudent.findUnique({
    where: { tutorId_studentId: { tutorId: user.id, studentId } }
  })
  if (!relation) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }
}

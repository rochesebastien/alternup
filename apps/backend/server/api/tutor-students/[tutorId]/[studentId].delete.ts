import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const tutorId = getRouterParam(event, 'tutorId')
  const studentId = getRouterParam(event, 'studentId')

  if (!tutorId || !studentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Both tutor ID and student ID are required'
    })
  }

  const { error } = await supabase
    .from('tutor_students')
    .delete()
    .eq('tutor_id', tutorId)
    .eq('student_id', studentId)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return { message: 'Tutor-student relationship deleted successfully' }
})
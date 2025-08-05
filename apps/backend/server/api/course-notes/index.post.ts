import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('course_notes')
    .insert([{
      assignment_id: body.assignment_id,
      session_date: body.session_date,
      grade: body.grade,
      comment: body.comment,
      notions_covered: body.notions_covered
    }])
    .select(`
      *,
      assignment:course_assignments(
        id,
        start_date,
        end_date,
        student:profiles!student_id(
          id,
          first_name,
          last_name,
          email,
          role
        ),
        course:courses(
          id,
          title,
          description
        )
      )
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})
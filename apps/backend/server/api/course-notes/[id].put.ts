import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Note ID is required'
    })
  }

  const { data, error } = await supabase
    .from('course_notes')
    .update({
      session_date: body.session_date,
      grade: body.grade,
      comment: body.comment,
      notions_covered: body.notions_covered
    })
    .eq('id', id)
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
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.code === 'PGRST116' ? 'Note not found' : error.message
    })
  }

  return data
})
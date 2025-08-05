import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  
  const { data, error } = await supabase
    .from('course_notes')
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
    .order('session_date', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
import { getSupabaseClient } from '../../plugins/supabase'


export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  
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
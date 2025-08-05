import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  
  const { data, error } = await supabase
    .from('course_assignments')
    .select(`
      *,
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
        description,
        created_by,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
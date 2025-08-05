import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Student ID is required'
    })
  }

  const { data, error } = await supabase
    .from('tutor_students')
    .select(`
      *,
      tutor:profiles!tutor_id(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .eq('student_id', id)
    .order('added_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
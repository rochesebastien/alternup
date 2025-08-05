import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  
  const { data, error } = await supabase
    .from('calendar_events')
    .select(`
      *,
      student:profiles!student_id(
        id,
        first_name,
        last_name,
        email,
        role
      ),
      tutor:profiles!tutor_id(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .order('start_time', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
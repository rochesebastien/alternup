import { getSupabaseClient } from '../../plugins/supabase'


export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  
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
      ),
      student:profiles!student_id(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .order('added_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
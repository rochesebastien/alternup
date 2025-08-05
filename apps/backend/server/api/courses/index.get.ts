import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  
  const { data, error } = await supabase
    .from('courses')
    .select(`
      *,
      created_by_profile:profiles!created_by(
        id,
        first_name,
        last_name,
        email,
        role
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
import { getSupabaseClient } from '../../plugins/supabase'

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message
    })
  }

  return data
})
import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Profile ID is required'
    })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      role: body.role
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.code === 'PGRST116' ? 'Profile not found' : error.message
    })
  }

  return data
})
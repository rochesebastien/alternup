import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project ID is required'
    })
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      title: body.title,
      description: body.description,
      internal: body.internal
    })
    .eq('id', id)
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
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.code === 'PGRST116' ? 'Project not found' : error.message
    })
  }

  return data
})
import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('projects')
    .insert([{
      title: body.title,
      description: body.description,
      internal: body.internal ?? true,
      created_by: body.created_by
    }])
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
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})
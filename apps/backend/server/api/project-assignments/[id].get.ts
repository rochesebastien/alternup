import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Assignment ID is required'
    })
  }

  const { data, error } = await supabase
    .from('project_assignments')
    .select(`
      *,
      project:projects(
        id,
        title,
        description,
        internal,
        created_at
      ),
      student:profiles!student_id(
        id,
        first_name,
        last_name,
        email,
        role
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 500,
      statusMessage: error.code === 'PGRST116' ? 'Assignment not found' : error.message
    })
  }

  return data
})
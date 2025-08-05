import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Course ID is required'
    })
  }

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
      ),
      assignments:course_assignments(
        id,
        start_date,
        end_date,
        created_at,
        student:profiles!student_id(
          id,
          first_name,
          last_name,
          email,
          role
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 500,
      statusMessage: error.code === 'PGRST116' ? 'Course not found' : error.message
    })
  }

  return data
})
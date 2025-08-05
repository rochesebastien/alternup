import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Assignment ID is required'
    })
  }

  const { data, error } = await supabase
    .from('course_assignments')
    .update({
      start_date: body.start_date,
      end_date: body.end_date
    })
    .eq('id', id)
    .select(`
      *,
      student:profiles!student_id(
        id,
        first_name,
        last_name,
        email,
        role
      ),
      course:courses(
        id,
        title,
        description,
        created_by,
        created_at
      )
    `)
    .single()

  if (error) {
    throw createError({
      statusCode: error.code === 'PGRST116' ? 404 : 400,
      statusMessage: error.code === 'PGRST116' ? 'Assignment not found' : error.message
    })
  }

  return data
})
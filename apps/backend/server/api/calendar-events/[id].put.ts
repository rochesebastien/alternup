import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Event ID is required'
    })
  }

  const { data, error } = await supabase
    .from('calendar_events')
    .update({
      student_id: body.student_id,
      tutor_id: body.tutor_id,
      title: body.title,
      start_time: body.start_time,
      end_time: body.end_time
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
      tutor:profiles!tutor_id(
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
      statusMessage: error.code === 'PGRST116' ? 'Event not found' : error.message
    })
  }

  return data
})
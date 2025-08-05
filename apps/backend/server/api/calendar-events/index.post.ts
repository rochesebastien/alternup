import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('calendar_events')
    .insert([{
      student_id: body.student_id,
      tutor_id: body.tutor_id,
      title: body.title,
      start_time: body.start_time,
      end_time: body.end_time
    }])
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
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})
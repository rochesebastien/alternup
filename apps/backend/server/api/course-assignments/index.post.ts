import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('course_assignments')
    .insert([{
      student_id: body.student_id,
      course_id: body.course_id,
      start_date: body.start_date,
      end_date: body.end_date
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
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})
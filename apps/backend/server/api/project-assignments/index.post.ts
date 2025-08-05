import { SupabaseClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const supabase: SupabaseClient = event.context.supabase
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('project_assignments')
    .insert([{
      project_id: body.project_id,
      student_id: body.student_id,
      status: body.status ?? 'non_demarre',
      tutor_comment: body.tutor_comment,
      student_comment: body.student_comment,
      started_at: body.started_at
    }])
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
    .single()

  if (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error.message
    })
  }

  return data
})
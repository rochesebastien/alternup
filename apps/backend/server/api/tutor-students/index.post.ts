

export default defineEventHandler(async (event) => {
  const supabase = getSupabaseClient()
  const body = await readBody(event)

  const { data, error } = await supabase
    .from('tutor_students')
    .insert([{
      tutor_id: body.tutor_id,
      student_id: body.student_id
    }])
    .select(`
      *,
      tutor:profiles!tutor_id(
        id,
        first_name,
        last_name,
        email,
        role
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
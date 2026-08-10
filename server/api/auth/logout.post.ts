export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { message: 'Déconnexion effectuée.' }
})

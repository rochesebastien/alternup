import bcrypt from 'bcrypt'
import { prisma } from '~/server/utils/prisma'
import { Role } from '~/shared/utils/enums'

// Compte de test provisionné au démarrage à partir des variables d'environnement
// TEMP_LOGIN / TEMP_PASS (et TEMP_ROLE, optionnelle : Tutor par défaut).
// Les deux variables doivent être renseignées ensemble ; sinon, rien n'est créé.
// Le compte est réaligné à chaque démarrage : changer TEMP_PASS puis redéployer
// suffit à mettre à jour le mot de passe.

const PASSWORD_COST = 12
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function resolveRole(raw: string | undefined): Role {
  if (raw && raw in Role) return Role[raw as keyof typeof Role]
  if (raw) {
    console.warn(`[temp-account] TEMP_ROLE="${raw}" inconnu, rôle Tutor appliqué.`)
  }
  return Role.Tutor
}

export default defineNitroPlugin(async () => {
  const login = process.env.TEMP_LOGIN?.trim().toLowerCase()
  const password = process.env.TEMP_PASS

  if (!login || !password) return

  if (!EMAIL_PATTERN.test(login)) {
    console.warn('[temp-account] TEMP_LOGIN doit être une adresse e-mail. Compte ignoré.')
    return
  }

  const role = resolveRole(process.env.TEMP_ROLE)

  try {
    const passwordHash = await bcrypt.hash(password, PASSWORD_COST)
    await prisma.user.upsert({
      where: { email: login },
      update: { passwordHash, role },
      create: {
        email: login,
        passwordHash,
        role,
        firstName: 'Compte',
        lastName: 'Test'
      }
    })
    console.warn(`[temp-account] Compte de test actif : ${login} (${role}).`)
  } catch (err) {
    // Une base indisponible ne doit jamais empêcher le serveur de démarrer.
    console.error('[temp-account] Provisionnement impossible :', err)
  }
})

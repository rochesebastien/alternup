import { z } from 'zod'
import { fr } from 'zod/locales'

export default defineNitroPlugin(() => {
  z.config(fr())
})

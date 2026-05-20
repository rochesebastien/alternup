import { z } from 'zod'
import { fr } from 'zod/locales'

export default defineNuxtPlugin(() => {
  z.config(fr())
})

# Utilisation d'une image Node.js officielle comme base
FROM node:alpine3.21 AS base

# Installation des dépendances seulement quand nécessaire
FROM base AS deps
# Vérification de https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installation des dépendances basée sur le gestionnaire de packages préféré
COPY nextjs_app/package.json nextjs_app/package-lock.json* ./
RUN npm ci --only=production

# Rebuild du code source seulement quand nécessaire
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY nextjs_app/ .

# Next.js collecte des données télémétriques complètement anonymes sur l'utilisation générale.
# En savoir plus ici: https://nextjs.org/telemetry
# Décommentez la ligne suivante si vous voulez désactiver la télémétrie lors du build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Image de production, copie tous les fichiers et lance next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Décommentez la ligne suivante si vous voulez désactiver la télémétrie lors de l'exécution.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Définition automatique des permissions de sortie avec Next.js standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# serveur.js est créé par next build à partir de la configuration de sortie standalone
CMD ["node", "server.js"]
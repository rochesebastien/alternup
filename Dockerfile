# Stage 1 — install all deps (incl. dev) and build the Nuxt app
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .
RUN npm run build

# Stage 2 — production runtime, only the built output + prod deps
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Non-root runtime user
RUN addgroup -S -g 10001 alternup && adduser -S -u 10001 -G alternup alternup

COPY package*.json ./
# --ignore-scripts skips devDep-only hooks (husky/prepare, nuxt prepare/postinstall).
# Husky is a devDep and not present here; the runner has no git repo to hook into anyway.
# The .nuxt/ types `nuxt prepare` would generate are useless at runtime — we COPY the built
# .output/ from the builder stage just below.
RUN npm ci --omit=dev --ignore-scripts

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY --from=builder /app/.output ./.output

RUN chown -R alternup:alternup /app

USER alternup

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

# Apply pending migrations then start the Nitro server
CMD ["sh", "-c", "npx prisma migrate deploy && node .output/server/index.mjs"]

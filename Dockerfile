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

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY --from=builder /app/.output ./.output

EXPOSE 3000
# Apply pending migrations then start the Nitro server
CMD ["sh", "-c", "npx prisma migrate deploy && node .output/server/index.mjs"]

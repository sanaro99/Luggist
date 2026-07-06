# syntax=docker/dockerfile:1
# Multi-stage build for the Luggist Next.js app.
# Produces a small runtime image from Next's standalone output.

FROM node:22-alpine AS base
# libc6-compat helps some native/npm deps run on Alpine.
RUN apk add --no-cache libc6-compat

# --- Install dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Build the app ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- Runtime image ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Copy the standalone server, static assets, and public files.
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# AI features read AI_PROVIDER / AI_MODEL / AI_BASE_URL / AI_API_KEY at runtime.
# They are injected as container env vars, never baked into the image.
CMD ["node", "server.js"]

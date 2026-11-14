# Explicitly pin Node.js version to match .nvmrc across local and container builds
ARG NODE_VERSION=22

# Stage 1: Build Vite frontend assets & prune dev dependencies
FROM node:${NODE_VERSION}-alpine AS builder

ENV NODE_VERSION=22

WORKDIR /app

COPY .nvmrc package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY index.html metadata.json tsconfig.json vite.config.ts server.ts ./
COPY public ./public
COPY src ./src

RUN npm run build && npm prune --omit=dev --legacy-peer-deps

# Stage 2: Lean production runtime
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app

ENV NODE_VERSION=22
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--experimental-strip-types"

COPY --chown=node:node .nvmrc package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node server.ts ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start"]

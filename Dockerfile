# --- Build: install everything, build the app, compile the seed and catalog scripts, then drop dev tools ---
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build \
 && npm run build:scripts \
 && npm prune --omit=dev

# --- Runtime: no build tools; the web server runs as the unprivileged "node" user ---
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# Strip Windows line endings in case the script was checked out with CRLF.
RUN sed -i 's/\r$//' scripts/docker-entrypoint.sh \
 && chmod +x scripts/docker-entrypoint.sh \
 && mkdir -p /app/storage /app/.next/cache \
 && chown node:node /app/storage /app/.next/cache
EXPOSE 3000
# Starts as root only to fix ownership of the storage volume and run migrations/seed,
# then switches to "node" for the server (see scripts/docker-entrypoint.sh).
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

#!/bin/sh
# Container start: prepare storage, migrate and seed the database, then run the
# web server as the unprivileged "node" user.
set -eu

APP_USER="${APP_USER:-node}"
STORAGE="${DIAGNOSTIC_STORAGE_PATH:-/app/storage}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$STORAGE" /app/.next/cache
  # Uploads saved by older versions of the image were written as root. Hand
  # anything not yet owned by the app user over to it (fast after the first run).
  find "$STORAGE" /app/.next/cache ! -user "$APP_USER" -exec chown "$APP_USER:$APP_USER" {} +
fi

# Short-lived setup steps. They only talk to the database.
npm run --silent db:migrate
npm run --silent db:seed:prod

if [ "$(id -u)" = "0" ]; then
  # Drop root for the long-running server; exec so it receives stop signals directly.
  exec setpriv --reuid="$APP_USER" --regid="$APP_USER" --init-groups --no-new-privs -- node_modules/.bin/next start "$@"
fi
exec node_modules/.bin/next start "$@"

#!/bin/sh
set -eu
php bin/migrate.php
if [ "${1:-serve}" != serve ]; then exec "$@"; fi

# Coolify shared env often sets PORT=3000 for the Next.js web service.
# If the PHP container inherits that, nginx would listen on 3000 while
# GRESSPAY_PHP_URL=http://php:8080 → Google login 502 / stack Degraded.
# Always bind the API on API_PORT (default 8080), ignoring web PORT.
LISTEN_PORT="${API_PORT:-8080}"
case "${LISTEN_PORT}" in ''|*[!0-9]*) echo "Invalid API_PORT=${LISTEN_PORT}" >&2; exit 1;; esac

# Keep PORT in sync for any PHP code that reads it, but never follow web's 3000.
export PORT="${LISTEN_PORT}"
echo "GressPay API listening on ${LISTEN_PORT} (API_PORT; ignoring Coolify web PORT)" >&2

sed "s/__PORT__/${LISTEN_PORT}/g" /etc/nginx/nginx.conf.template > /tmp/nginx/nginx.conf
# Validate paths/permissions before starting FPM. A startup failure must remain
# visible in container logs rather than leave an apparently running PHP process.
nginx -t -c /tmp/nginx/nginx.conf
php-fpm -F &
fpm_pid=$!
nginx -c /tmp/nginx/nginx.conf -g 'daemon off;' &
nginx_pid=$!
trap 'kill "$fpm_pid" "$nginx_pid" 2>/dev/null || true' EXIT INT TERM
# Exit the container if either server dies, allowing Compose to restart it.
wait -n "$fpm_pid" "$nginx_pid"

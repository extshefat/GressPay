#!/bin/sh
set -eu

PORT="${PORT:-8080}"
TEMPLATE="/etc/nginx/templates/gresspay-api.conf.template"
TARGET="/etc/nginx/http.d/default.conf"

if [ -f "$TEMPLATE" ]; then
  sed "s/LISTEN_PORT/${PORT}/g" "$TEMPLATE" > "$TARGET"
fi

# php-fpm listens on 9000 (official image default)
if [ "${1:-}" = "webhook-worker" ]; then
  exec php /var/www/gresspay-api/jobs/WebhookWorker.php
fi

php-fpm -D
exec nginx -g "daemon off;"

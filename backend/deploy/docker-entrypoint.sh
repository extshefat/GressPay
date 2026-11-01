#!/bin/sh
set -eu

PORT="${PORT:-8080}"

if [ "${1:-}" = "webhook-worker" ]; then
  exec php /var/www/gresspay-api/jobs/WebhookWorker.php
fi

cd /var/www/gresspay-api
exec php -S "0.0.0.0:${PORT}" -t public public/index.php

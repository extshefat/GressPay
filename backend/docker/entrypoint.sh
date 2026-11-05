#!/bin/sh
set -eu
PORT="${PORT:-8080}"
export PORT

# Apply migrations before accepting traffic.
php /var/www/gresspay-api/bin/migrate.php || {
  echo "migrate failed" >&2
  exit 1
}

# Render nginx listen port from $PORT.
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# php-fpm listens on 9000 (default); workers run as www-data.
php-fpm -D
exec nginx -g 'daemon off;'

#!/bin/sh
set -eu
php bin/migrate.php
if [ "${1:-serve}" != serve ]; then exec "$@"; fi
case "${PORT:-8080}" in ''|*[!0-9]*) echo 'Invalid PORT' >&2; exit 1;; esac
sed "s/__PORT__/${PORT:-8080}/g" /etc/nginx/nginx.conf.template > /tmp/nginx/nginx.conf
php-fpm -F &
fpm_pid=$!
nginx -c /tmp/nginx/nginx.conf -g 'daemon off;' &
nginx_pid=$!
trap 'kill "$fpm_pid" "$nginx_pid" 2>/dev/null || true' EXIT INT TERM
# Exit the container if either server dies, allowing Compose to restart it.
wait -n "$fpm_pid" "$nginx_pid"

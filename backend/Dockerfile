# Coolify-friendly HTTP API image: php-fpm + nginx on $PORT.
# Merchant secrets are NOT baked in — pass platform env via Coolify only.
FROM php:8.2-fpm-alpine

RUN apk add --no-cache icu-dev curl-dev postgresql-dev nginx gettext $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql pgsql bcmath \
    && apk del --no-cache $PHPIZE_DEPS

WORKDIR /var/www/gresspay-api
COPY . /var/www/gresspay-api

RUN mkdir -p /var/www/gresspay-api/storage /run/nginx /var/log/nginx /var/lib/nginx/tmp \
    && chown -R www-data:www-data /var/www/gresspay-api \
    && chmod +x /var/www/gresspay-api/bin/migrate.php /var/www/gresspay-api/docker/entrypoint.sh

COPY docker/nginx.conf /etc/nginx/http.d/default.conf.template
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV PORT=8080
EXPOSE 8080

# Run as root briefly for nginx bind; php-fpm workers drop to www-data.
USER root
ENTRYPOINT ["/entrypoint.sh"]

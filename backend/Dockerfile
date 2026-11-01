# Coolify-friendly API image: nginx (HTTP :$PORT) → php-fpm (:9000).
# Merchant secrets are NOT baked in — pass platform env via Coolify only.
# Never use PHP built-in server (php -S) in production.
FROM php:8.2-fpm-alpine

RUN apk add --no-cache nginx icu-dev curl-dev postgresql-dev $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql pgsql bcmath \
    && apk del --no-cache $PHPIZE_DEPS \
    && mkdir -p /run/nginx /etc/nginx/http.d /etc/nginx/templates \
    && rm -f /etc/nginx/http.d/default.conf

WORKDIR /var/www/gresspay-api
COPY . /var/www/gresspay-api

COPY deploy/nginx.docker.conf /etc/nginx/templates/gresspay-api.conf.template
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /var/www/gresspay-api/storage \
    && chown -R www-data:www-data /var/www/gresspay-api \
    && sed -i 's|^listen = .*|listen = 127.0.0.1:9000|' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's|^;clear_env = no|clear_env = no|' /usr/local/etc/php-fpm.d/www.conf

ENV PORT=8080
EXPOSE 8080

# Root starts php-fpm + nginx; FPM workers run as www-data.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["api"]

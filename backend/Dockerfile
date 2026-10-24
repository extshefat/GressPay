# Coolify-friendly HTTP API image (binds 0.0.0.0:$PORT).
# Merchant secrets are NOT baked in — pass platform env via Coolify only.
FROM php:8.2-cli-alpine

RUN apk add --no-cache icu-dev curl-dev $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_mysql bcmath \
    && apk del --no-cache $PHPIZE_DEPS

WORKDIR /var/www/gresspay-api
COPY . /var/www/gresspay-api

RUN mkdir -p /var/www/gresspay-api/storage \
    && chown -R www-data:www-data /var/www/gresspay-api

ENV PORT=8080
EXPOSE 8080

USER www-data
CMD ["sh", "-c", "exec php -S 0.0.0.0:${PORT:-8080} -t public public/index.php"]

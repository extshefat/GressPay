# Coolify-friendly HTTP API image (binds 0.0.0.0:$PORT).
# Merchant secrets are NOT baked in — pass platform env via Coolify only.
#
# Hotfix after #26: nginx→php-fpm broke Coolify origin health (Cloudflare 502).
# HTTP serve is restored to the previous php built-in listener. Webhook durability
# remains via gp_webhook_queue + webhook-worker (same image, command: webhook-worker).
FROM php:8.2-cli-alpine

RUN apk add --no-cache icu-dev curl-dev postgresql-dev $PHPIZE_DEPS \
    && docker-php-ext-install pdo pdo_mysql pdo_pgsql pgsql bcmath \
    && apk del --no-cache $PHPIZE_DEPS

WORKDIR /var/www/gresspay-api
COPY . /var/www/gresspay-api

COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /var/www/gresspay-api/storage \
    && chown -R www-data:www-data /var/www/gresspay-api

ENV PORT=8080
EXPOSE 8080

USER www-data
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["api"]

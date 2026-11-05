# Non-root nginx + FPM API. PORT and /api/v1/health remain compatible with Coolify.
FROM php:8.2-fpm-alpine
RUN apk add --no-cache nginx postgresql-dev libpng-dev libjpeg-turbo-dev libwebp-dev $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-jpeg --with-webp \
    && docker-php-ext-install -j2 pdo_mysql pdo_pgsql pgsql bcmath opcache gd \
    && apk del --no-cache $PHPIZE_DEPS
WORKDIR /var/www/gresspay-api
COPY --chown=www-data:www-data . .
COPY deploy/nginx.docker.conf /etc/nginx/nginx.conf.template
COPY deploy/entrypoint.sh /usr/local/bin/gresspay-entrypoint
COPY deploy/php-security.ini /usr/local/etc/php/conf.d/zz-security.ini
RUN mkdir -p storage /tmp/nginx /tmp/php \
    && chown -R www-data:www-data storage /tmp/nginx /tmp/php \
    && chmod +x /usr/local/bin/gresspay-entrypoint \
    && printf '[www]\nlisten = 127.0.0.1:9000\nclear_env = no\npm = dynamic\npm.max_children = 12\npm.start_servers = 2\npm.min_spare_servers = 2\npm.max_spare_servers = 4\nrequest_terminate_timeout = 60s\n' > /usr/local/etc/php-fpm.d/zz-gresspay.conf
ENV PORT=8080
EXPOSE 8080
USER www-data
ENTRYPOINT ["gresspay-entrypoint"]
CMD ["serve"]

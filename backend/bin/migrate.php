#!/usr/bin/env php
<?php
declare(strict_types=1);

/**
 * Apply schema migrations then exit.
 * Docker entrypoint should run this before starting php-fpm/nginx.
 */
putenv('GRESSPAY_MIGRATE_CLI=1');
$_ENV['GRESSPAY_MIGRATE_CLI'] = '1';

$root = dirname(__DIR__);
require_once $root . '/src/bootstrap.php';

// Force migration even when APP_ENV=production (CLI only).
GpSchema::migrateToLatest();
$ver = GpSchema::currentVersion();
fwrite(STDOUT, "GressPay schema at version {$ver}\n");
exit(0);

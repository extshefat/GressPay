#!/usr/bin/env php
<?php
declare(strict_types=1);
require dirname(__DIR__) . '/src/bootstrap.php';
GpMigrations::run();
fwrite(STDOUT, "Schema migrations complete.\n");

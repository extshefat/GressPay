#!/usr/bin/env php
<?php
declare(strict_types=1);

require dirname(__DIR__) . '/src/bootstrap.php';

$poll = (int) (getenv('WEBHOOK_WORKER_POLL_SECONDS') ?: 5);
GpWebhookWorker::runLoop($poll);

<?php
declare(strict_types=1);

/**
 * Persistent webhook delivery worker.
 * Polls gp_webhook_queue every 5s; exponential backoff is stored on the row.
 *
 * Usage: php /var/www/gresspay-api/jobs/WebhookWorker.php
 * Docker: command webhook-worker
 */
final class GpWebhookWorker
{
    public static function runLoop(int $pollSeconds = 5): never
    {
        $pollSeconds = max(1, min(60, $pollSeconds));
        fwrite(STDOUT, "[WebhookWorker] started poll={$pollSeconds}s\n");
        $nextExpirySweep = 0;
        while (true) {
            try {
                if (time() >= $nextExpirySweep) {
                    $now = gmdate('Y-m-d\TH:i:s\Z');
                    GpDb::exec(
                        "UPDATE gp_transactions SET status = 'expired', updated_at = ? WHERE currency = 'BDT' AND status IN ('initiated','pending') AND expires_at IS NOT NULL AND expires_at <> '' AND expires_at <= ?",
                        [GpIds::now(), $now]
                    );
                    GpRateLimiter::cleanupExpired(60);
                    $nextExpirySweep = time() + 30;
                }
                $claimed = GpWebhook::claimDueQueue(10);
                foreach ($claimed as $row) {
                    try {
                        GpWebhook::processQueueRow($row);
                    } catch (Throwable $e) {
                        $id = (int) ($row['id'] ?? 0);
                        error_log("[WebhookWorker] row {$id}: " . $e->getMessage());
                        if ($id > 0) {
                            $now = GpIds::now();
                            GpDb::exec(
                                "UPDATE gp_webhook_queue SET status = 'pending', next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ? AND status = 'processing'",
                                [$now, substr($e->getMessage(), 0, 500), $now, $id]
                            );
                        }
                    }
                }
            } catch (Throwable $e) {
                error_log('[WebhookWorker] loop: ' . $e->getMessage());
            }
            sleep($pollSeconds);
        }
    }
}

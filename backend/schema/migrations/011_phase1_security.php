<?php
declare(strict_types=1);

/**
 * Phase 1 security additive columns (idempotent ALTERs).
 * @return callable(PDO,string):void
 */
return static function (PDO $pdo, string $driver): void {
    $alters = [
        'ALTER TABLE gp_merchants ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE gp_merchants ADD COLUMN email_verified_at VARCHAR(32)',
        'ALTER TABLE gp_merchants ADD COLUMN email_verify_token_hash VARCHAR(64)',
        'ALTER TABLE gp_merchants ADD COLUMN email_verify_expires_at VARCHAR(32)',
        'ALTER TABLE gp_merchants ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE gp_devices ADD COLUMN token_prefix VARCHAR(12)',
        'ALTER TABLE gp_brands ADD COLUMN require_payer_match INTEGER NOT NULL DEFAULT 1',
    ];
    foreach ($alters as $sql) {
        try {
            $pdo->exec($sql);
        } catch (Throwable $e) {
            // column exists
        }
    }
};

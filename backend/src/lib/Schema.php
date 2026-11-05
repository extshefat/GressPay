<?php
declare(strict_types=1);
/** Preserve the upstream schema API and singleton history while applying additive upgrades. */
final class GpSchema
{
    public const CURRENT = 15;
    public static function migrateToLatest(bool $forceFullInstall = false): void { GpMigrations::run(); }
    public static function currentVersion(): int {
        try {
            $row=GpDb::one('SELECT MAX(version) AS version FROM gp_security_migrations');
            if (!empty($row['version'])) return 11+(int)$row['version'];
        } catch (Throwable $e) { /* pre-upgrade database */ }
        try { return (int)(GpDb::one('SELECT version FROM gp_schema_version WHERE id = 1')['version'] ?? 0); }
        catch (Throwable $e) { return 0; }
    }
}

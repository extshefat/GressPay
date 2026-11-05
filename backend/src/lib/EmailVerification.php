<?php
declare(strict_types=1);

final class GpEmailVerification
{
    /** Called only after Google returns email_verified=true, inside the linking transaction. */
    public static function adoptGoogleIdentity(array $merchant): void
    {
        if (empty($merchant['email_verified'])) {
            GpDb::exec('UPDATE gp_merchants SET password_hash = NULL, token_version = token_version + 1 WHERE merchant_id = ?', [$merchant['merchant_id']]);
        }
        GpDb::exec('UPDATE gp_merchants SET email_verified = 1, verified_at = COALESCE(verified_at, ?) WHERE merchant_id = ?', [GpIds::now(), $merchant['merchant_id']]);
    }

    public static function issue(string $merchantId): string
    {
        GpDb::exec('DELETE FROM gp_email_verifications WHERE expires_at < ?', [time() - 86400]);
        $payload = $merchantId . '.' . (time() + 86400) . '.' . bin2hex(random_bytes(24));
        $token = $payload . '.' . hash_hmac('sha256', 'verify-email|' . $payload, GpConfig::jwtSecret());
        GpDb::exec('INSERT INTO gp_email_verifications (token_hash, merchant_id, expires_at) VALUES (?, ?, ?)', [hash('sha256', $token), $merchantId, time() + 86400]);
        return $token;
    }

    public static function consume(string $token, string $email = ''): bool
    {
        if (strlen($token) > 1024) return false;
        if ($email !== '' && preg_match('/^[a-f0-9]{64}$/D', $token)) return self::consumeLegacy($token, $email);
        $parts = explode('.', $token);
        if (count($parts) !== 4 || !ctype_digit($parts[1]) || (int) $parts[1] <= time()) return false;
        $signature = array_pop($parts);
        if (!hash_equals(hash_hmac('sha256', 'verify-email|' . implode('.', $parts), GpConfig::jwtSecret()), $signature)) return false;
        $pdo = GpDb::pdo(); $pdo->beginTransaction();
        try {
            $row = GpDb::one('SELECT * FROM gp_email_verifications WHERE token_hash = ? AND merchant_id = ?', [hash('sha256', $token), $parts[0]]);
            if (!$row || (int) $row['expires_at'] <= time() || GpDb::exec('UPDATE gp_email_verifications SET used_at = ? WHERE token_hash = ? AND used_at IS NULL', [GpIds::now(), hash('sha256', $token)]) !== 1) {
                $pdo->rollBack(); return false;
            }
            GpDb::exec('UPDATE gp_merchants SET email_verified = 1, verified_at = ?, token_version = token_version + 1 WHERE merchant_id = ?', [GpIds::now(), $row['merchant_id']]);
            // Revoke other outstanding verification links for this identity.
            GpDb::exec('UPDATE gp_email_verifications SET used_at = ? WHERE merchant_id = ? AND used_at IS NULL', [GpIds::now(), $row['merchant_id']]);
            $pdo->commit(); return true;
        } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
    }

    /** Preserve still-valid links issued by the upstream implementation before this merge. */
    private static function consumeLegacy(string $token, string $email): bool
    {
        $hash=hash('sha256',$token); $now=GpIds::now();
        return GpDb::exec('UPDATE gp_merchants SET email_verified = 1, verified_at = ?, email_verified_at = ?, email_verify_token_hash = NULL, email_verify_expires_at = NULL, token_version = token_version + 1 WHERE email = ? AND email_verify_token_hash = ? AND email_verify_expires_at > ? AND email_verified = 0', [$now,$now,strtolower(trim($email)),$hash,$now]) === 1;
    }

    public static function send(array $merchant): void
    {
        $token = self::issue($merchant['merchant_id']);
        $link = GpConfig::publicAppUrl() . '/verify-email#token=' . rawurlencode($token);
        GpMailer::verification($merchant['email'], $link);
    }
}

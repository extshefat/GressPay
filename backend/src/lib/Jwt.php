<?php
declare(strict_types=1);

final class GpJwt
{
    /** Default dashboard session: 24 hours. */
    public const TTL_DEFAULT = 86400;

    /** Remember-me dashboard session: 7 days. */
    public const TTL_REMEMBER = 604800;

    public static function encode(array $payload, int $ttlSeconds = self::TTL_DEFAULT): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $merchant = GpDb::one('SELECT token_version FROM gp_merchants WHERE merchant_id = ?', [(string) ($payload['sub'] ?? '')]);
        $payload['tv'] = (int) ($payload['tv'] ?? $merchant['token_version'] ?? 0);
        $payload['jti'] = bin2hex(random_bytes(16));
        $payload['iat'] = time();
        $payload['exp'] = time() + $ttlSeconds;
        $h = self::b64(json_encode($header, JSON_UNESCAPED_SLASHES));
        $p = self::b64(json_encode($payload, JSON_UNESCAPED_SLASHES));
        $sig = self::b64(hash_hmac('sha256', $h . '.' . $p, GpConfig::jwtSecret(), true));
        return $h . '.' . $p . '.' . $sig;
    }

    public static function decode(string $token): ?array
    {
        if (strlen($token) > 4096) return null;
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $s] = $parts;
        $header = json_decode(self::ub64($h), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256' || strlen($token) > 4096) return null;
        $expected = self::b64(hash_hmac('sha256', $h . '.' . $p, GpConfig::jwtSecret(), true));
        if (!hash_equals($expected, $s)) {
            return null;
        }
        $payload = json_decode(self::ub64($p), true);
        if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
            return null;
        }
        return $payload;
    }

    /** Issue a merchant session JWT including token_version. */
    public static function issueForMerchant(array $merchant, array $extra = [], int $ttl = self::TTL_DEFAULT): string
    {
        $email = strtolower(trim((string) ($merchant['email'] ?? '')));
        $verified = !empty($merchant['email_verified']);
        $isAdmin = $verified && (GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin'));
        $payload = array_merge([
            'sub' => $merchant['merchant_id'],
            'brand' => '',
            'email' => $merchant['email'] ?? '',
            'role' => $isAdmin ? 'admin' : ($merchant['role'] ?? 'merchant'),
            'is_admin' => $isAdmin,
            'plan_id' => $isAdmin ? 'lifetime' : ($merchant['plan_id'] ?? 'starter'),
            'tv' => (int) ($merchant['token_version'] ?? 0),
            'jti' => bin2hex(random_bytes(16)),
        ], $extra);
        return self::encode($payload, $ttl);
    }

    public static function bumpTokenVersion(string $merchantId): int
    {
        GpAuth::revokeSessions($merchantId);
        return (int) (GpDb::one('SELECT token_version FROM gp_merchants WHERE merchant_id = ?', [$merchantId])['token_version'] ?? 0);
    }

    private static function b64(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function ub64(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) {
            $data .= str_repeat('=', 4 - $pad);
        }
        return (string) base64_decode(strtr($data, '-_', '+/'));
    }
}

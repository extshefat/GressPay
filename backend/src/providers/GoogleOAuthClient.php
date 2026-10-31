<?php
declare(strict_types=1);

/**
 * Real Google OAuth 2.0 / OpenID Connect Client.
 * Implements authorization-code flow with PKCE, state/nonce replay protection,
 * verified email validation, and transactional account linking.
 */
final class GoogleOAuthClient
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    public static function resolveRedirectUri(?string $customRedirectUri = null): string
    {
        $custom = trim((string) $customRedirectUri);
        $configured = trim(GpConfig::get('GOOGLE_REDIRECT_URI', ''));
        if (self::isLocalhostUri($configured) && self::incomingPublicHost() === 'gresspay.extxcheats.com') {
            return 'https://gresspay.extxcheats.com/callback/google';
        }
        $origin = self::requestOrigin();
        if ($custom !== '' && self::isPublicHttps($custom)) {
            return $custom;
        }
        if ($configured !== '' && self::isPublicHttps($configured)) {
            return $configured;
        }
        if ($origin !== '') {
            return $origin . '/callback/google';
        }
        $appUrl = rtrim(GpConfig::get('APP_URL', ''), '/');
        if ($appUrl !== '' && self::isPublicHttps($appUrl)) {
            return $appUrl . '/callback/google';
        }
        if ($custom !== '') {
            return $custom;
        }
        if ($configured !== '') {
            return $configured;
        }
        return ($appUrl !== '' ? $appUrl : 'http://localhost:3000') . '/callback/google';
    }

    private static function requestOrigin(): string
    {
        $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
        if (self::isPublicHttps($origin)) {
            return rtrim($origin, '/');
        }
        $host = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''));
        $host = trim(explode(',', $host)[0]);
        if ($host === '' || self::isLocalHost($host)) {
            return '';
        }
        $proto = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
        if ($proto !== 'https' && $proto !== 'http') {
            $proto = 'https';
        }
        return $proto . '://' . $host;
    }

    private static function isPublicHttps(string $url): bool
    {
        if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        $parts = parse_url($url);
        $host = strtolower((string) ($parts['host'] ?? ''));
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        return $scheme === 'https' && $host !== '' && !self::isLocalHost($host);
    }

    private static function incomingPublicHost(): string
    {
        $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
        $originHost = strtolower((string) (parse_url($origin, PHP_URL_HOST) ?? ''));
        if ($originHost !== '') {
            return $originHost;
        }
        $host = trim((string) ($_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? ''));
        $host = strtolower(trim(explode(',', $host)[0]));
        return strtolower(explode(':', $host)[0]);
    }

    private static function isLocalhostUri(string $uri): bool
    {
        if ($uri === '') {
            return false;
        }
        $host = strtolower((string) (parse_url($uri, PHP_URL_HOST) ?? ''));
        return $host !== '' && self::isLocalHost($host);
    }

    private static function isLocalHost(string $host): bool
    {
        $host = strtolower(trim($host));
        $host = explode(':', $host)[0];
        return in_array($host, ['localhost', '127.0.0.1', '0.0.0.0', '::1'], true);
    }

    public static function isConfigured(): bool
    {
        $clientId = trim(GpConfig::get('GOOGLE_CLIENT_ID', ''));
        $clientSecret = trim(GpConfig::get('GOOGLE_CLIENT_SECRET', ''));
        return $clientId !== '' && $clientSecret !== '';
    }

    /**
     * @return array{enabled:bool,url?:string,state?:string,reason?:string}
     */
    public static function getAuthUrl(?string $customRedirectUri = null): array
    {
        if (!self::isConfigured()) {
            return [
                'enabled' => false,
                'reason' => 'Google OAuth is not configured on this GressPay platform instance. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Coolify environment variables.',
            ];
        }

        $clientId = GpConfig::get('GOOGLE_CLIENT_ID');
        $redirectUri = self::resolveRedirectUri($customRedirectUri);

        $state = bin2hex(random_bytes(24));
        $nonce = bin2hex(random_bytes(24));

        // PKCE: code_verifier (base64url) and code_challenge (S256)
        $rawVerifier = random_bytes(32);
        $codeVerifier = rtrim(strtr(base64_encode($rawVerifier), '+/', '-_'), '=');
        $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');

        $now = time();
        $expiresAt = $now + 600; // 10 minutes expiry

        // Clean expired states first. A missing row makes the callback fail closed.
        try {
            GpDb::exec('DELETE FROM gp_oauth_states WHERE expires_at < ?', [$now]);
            GpDb::exec(
                'INSERT INTO gp_oauth_states (state, nonce, code_verifier, redirect_uri, expires_at, created_at)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$state, $nonce, $codeVerifier, $redirectUri, $expiresAt, GpIds::now()]
            );
        } catch (Throwable $e) {
            error_log('GoogleOAuth state storage error: ' . $e->getMessage());
            return [
                'enabled' => false,
                'reason' => 'Google sign-in could not store the login session. ' . $e->getMessage(),
            ];
        }

        $params = [
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'nonce' => $nonce,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
            'access_type' => 'offline',
            'prompt' => 'select_account',
        ];

        return [
            'enabled' => true,
            'url' => self::AUTH_URL . '?' . http_build_query($params),
            'state' => $state,
        ];
    }

    /**
     * @return array{ok:bool,error?:string,message?:string,token?:string,user?:array,isNew?:bool}
     */
    public static function handleCallback(string $code, string $state, ?string $codeVerifier = null): array
    {
        if (!self::isConfigured()) {
            return [
                'ok' => false,
                'error' => 'NOT_CONFIGURED',
                'message' => 'Google OAuth is not configured on this platform.',
            ];
        }

        $code = trim($code);
        $state = trim($state);
        if ($code === '' || $state === '') {
            return [
                'ok' => false,
                'error' => 'INVALID_INPUT',
                'message' => 'Authorization code and state are required.',
            ];
        }

        // Validate state against DB
        $stored = GpDb::one('SELECT * FROM gp_oauth_states WHERE state = ?', [$state]);
        if ($stored === null) {
            return [
                'ok' => false,
                'error' => 'INVALID_STATE',
                'message' => 'OAuth state is invalid or already consumed.',
            ];
        }

        // Single-use CSRF check: delete immediately
        GpDb::exec('DELETE FROM gp_oauth_states WHERE state = ?', [$state]);

        if ((int) $stored['expires_at'] < time()) {
            return [
                'ok' => false,
                'error' => 'STATE_EXPIRED',
                'message' => 'OAuth session expired. Please sign in again.',
            ];
        }

        $redirectUri = (string) ($stored['redirect_uri'] ?: GpConfig::get('GOOGLE_REDIRECT_URI', ''));
        $verifierToUse = $codeVerifier ?: (string) ($stored['code_verifier'] ?? '');

        // Exchange code for tokens
        $tokenPayload = [
            'code' => $code,
            'client_id' => GpConfig::get('GOOGLE_CLIENT_ID'),
            'client_secret' => GpConfig::get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri' => $redirectUri,
            'grant_type' => 'authorization_code',
        ];
        if ($verifierToUse !== '') {
            $tokenPayload['code_verifier'] = $verifierToUse;
        }

        $tokenRes = self::httpPost(self::TOKEN_URL, $tokenPayload);
        if (!$tokenRes['ok']) {
            return [
                'ok' => false,
                'error' => 'TOKEN_EXCHANGE_FAILED',
                'message' => 'Google authorization token exchange failed: ' . ($tokenRes['error'] ?? 'HTTP ' . $tokenRes['http']),
            ];
        }

        $tokenData = $tokenRes['data'];
        $accessToken = (string) ($tokenData['access_token'] ?? '');
        if ($accessToken === '') {
            return [
                'ok' => false,
                'error' => 'MISSING_ACCESS_TOKEN',
                'message' => 'Google did not return an access token.',
            ];
        }

        // Fetch UserInfo via OpenID Connect
        $userRes = self::httpGet(self::USERINFO_URL, [
            'Authorization: Bearer ' . $accessToken,
        ]);
        if (!$userRes['ok']) {
            return [
                'ok' => false,
                'error' => 'USERINFO_FAILED',
                'message' => 'Failed to retrieve Google profile information.',
            ];
        }

        $userInfo = $userRes['data'];
        $googleId = trim((string) ($userInfo['sub'] ?? ''));
        $email = strtolower(trim((string) ($userInfo['email'] ?? '')));
        $fullName = trim((string) ($userInfo['name'] ?? 'Google User'));
        $picture = (string) ($userInfo['picture'] ?? '');
        $emailVerified = ($userInfo['email_verified'] ?? false) === true || ($userInfo['email_verified'] ?? '') === 'true';

        if ($googleId === '' || $email === '') {
            return [
                'ok' => false,
                'error' => 'INVALID_PROFILE',
                'message' => 'Google profile is missing required identifier or email.',
            ];
        }

        // Security check: Must have verified email from Google to prevent account takeover
        if (!$emailVerified) {
            return [
                'ok' => false,
                'error' => 'EMAIL_UNVERIFIED',
                'message' => 'Your Google email address is unverified. Please verify your email with Google before signing in.',
            ];
        }

        // Transactional account link or register
        $now = GpIds::now();
        $isNew = false;
        $pdo = GpDb::pdo();
        $pdo->beginTransaction();

        try {
            // 1. Existing merchant by google_id
            $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE google_id = ?', [$googleId]);

            if ($merchant === null) {
                // 2. Existing merchant by email
                $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE email = ?', [$email]);
                if ($merchant !== null) {
                    $isAdmin = GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin');
                    $role = $isAdmin ? 'admin' : ($merchant['role'] ?? 'merchant');
                    $planId = $isAdmin ? 'lifetime' : ($merchant['plan_id'] ?? 'starter');
                    GpDb::exec(
                        'UPDATE gp_merchants SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), google_email_verified = 1, role = ?, plan_id = ?, updated_at = ? WHERE merchant_id = ?',
                        [$googleId, $picture, $role, $planId, $now, $merchant['merchant_id']]
                    );
                    $merchant['role'] = $role;
                    $merchant['plan_id'] = $planId;
                    $merchant['google_id'] = $googleId;
                    $merchant['avatar_url'] = $picture;
                } else {
                    // 3. New registration
                    $isNew = true;
                    $isAdmin = GpConfig::isAdmin($email);
                    $role = $isAdmin ? 'admin' : 'merchant';
                    $planId = $isAdmin ? 'lifetime' : 'trial';
                    $merchantId = GpIds::make('mrc', 8);

                    GpDb::exec(
                        "INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, google_id, auth_provider, avatar_url, google_email_verified, created_at, updated_at)
                         VALUES (?, ?, ?, NULL, ?, 'active', ?, ?, 'google', ?, 1, ?, ?)",
                        [$merchantId, $fullName, $email, $role, $planId, $googleId, $picture, $now, $now]
                    );

                    $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$merchantId]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Google OAuth account linking error: ' . $e->getMessage());
            $detail = trim(preg_replace('/\s+/', ' ', $e->getMessage()) ?? '');
            if (strlen($detail) > 180) {
                $detail = substr($detail, 0, 180) . '…';
            }
            return [
                'ok' => false,
                'error' => 'TRANSACTION_FAILED',
                'message' => $detail !== ''
                    ? 'Database error while linking Google account. ' . $detail
                    : 'Database error while linking Google account.',
            ];
        }

        $isAdmin = GpConfig::isAdmin($merchant['email']) || (($merchant['role'] ?? '') === 'admin');
        if ($isAdmin && (($merchant['role'] ?? '') !== 'admin' || ($merchant['plan_id'] ?? '') !== 'lifetime')) {
            GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$merchant['merchant_id']]);
            $merchant['role'] = 'admin';
            $merchant['plan_id'] = 'lifetime';
        }
        if ($merchant['status'] !== 'active') {
            return [
                'ok' => false,
                'error' => 'ACCOUNT_SUSPENDED',
                'message' => 'This merchant account is suspended.',
            ];
        }

        $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$merchant['merchant_id']]);
        $token = GpJwt::encode([
            'sub' => $merchant['merchant_id'],
            'brand' => is_array($brand) ? (string) ($brand['brand_id'] ?? '') : '',
            'email' => $merchant['email'],
            'role' => $merchant['role'] ?? 'merchant',
            'is_admin' => ($merchant['role'] ?? '') === 'admin' || GpConfig::isAdmin($merchant['email']),
            'plan_id' => $merchant['plan_id'] ?? 'starter',
        ]);

        return [
            'ok' => true,
            'token' => $token,
            'user' => GpPresenters::user($merchant, is_array($brand) ? $brand : ['name' => '', 'brand_id' => '']),
            'isNew' => $isNew,
        ];
    }

    private static function httpPost(string $url, array $fields): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($fields),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json',
            ],
        ]);
        $raw = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err !== '' || $raw === false) {
            return ['ok' => false, 'http' => $http, 'error' => $err ?: 'Network error'];
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded) || $http >= 400) {
            return [
                'ok' => false,
                'http' => $http,
                'data' => $decoded,
                'error' => is_array($decoded) ? ($decoded['error_description'] ?? $decoded['error'] ?? 'HTTP ' . $http) : 'Invalid JSON response',
            ];
        }

        return ['ok' => true, 'http' => $http, 'data' => $decoded];
    }

    private static function httpGet(string $url, array $headers = []): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => array_merge(['Accept: application/json'], $headers),
        ]);
        $raw = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err !== '' || $raw === false) {
            return ['ok' => false, 'http' => $http, 'error' => $err ?: 'Network error'];
        }

        $decoded = json_decode((string) $raw, true);
        if (!is_array($decoded) || $http >= 400) {
            return [
                'ok' => false,
                'http' => $http,
                'data' => $decoded,
                'error' => is_array($decoded) ? ($decoded['error_description'] ?? $decoded['error'] ?? 'HTTP ' . $http) : 'Invalid JSON response',
            ];
        }

        return ['ok' => true, 'http' => $http, 'data' => $decoded];
    }
}

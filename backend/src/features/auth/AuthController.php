<?php
declare(strict_types=1);

final class AuthController
{
    public static function handle(GpRequest $req): never
    {
        $action = $req->part(1) ?? '';
        $subAction = $req->part(2) ?? '';

        if ($req->method === 'POST' && $action === 'register') {
            self::register($req);
        }
        if ($req->method === 'POST' && $action === 'login') {
            self::login($req);
        }
        if ($req->method === 'POST' && $action === 'verify-email') {
            self::verifyEmail($req);
        }
        if ($req->method === 'POST' && $action === 'resend-verification') {
            self::resendVerification($req);
        }
        if ($action === 'me') {
            self::me($req);
        }
        if ($action === 'providers') {
            self::providers($req);
        }
        if ($action === 'google') {
            if ($req->method === 'GET' && ($subAction === 'url' || $subAction === '')) {
                self::googleUrl($req);
            }
            if ($req->method === 'POST' && $subAction === 'callback') {
                self::googleCallback($req);
            }
        }
        GpJson::error('NOT_FOUND', 'Unknown auth route.', 404);
    }

    public static function providers(GpRequest $req): never
    {
        GpJson::send([
            'password' => true,
            'google' => [
                'enabled' => GoogleOAuthClient::isConfigured(),
                'clientId' => GoogleOAuthClient::isConfigured() ? GpConfig::get('GOOGLE_CLIENT_ID') : null,
            ],
        ]);
    }

    public static function googleUrl(GpRequest $req): never
    {
        $redirect = (string) $req->query('redirect_uri', '');
        $data = GoogleOAuthClient::getAuthUrl($redirect !== '' ? $redirect : null);
        GpJson::send($data);
    }

    public static function googleCallback(GpRequest $req): never
    {
        GpRateLimiter::guard('oauth:' . GpRateLimiter::ip(), 15, 300);

        $code = (string) $req->input('code', '');
        $state = (string) $req->input('state', '');
        $verifier = (string) $req->input('code_verifier', '');

        if ($code === '' || $state === '') {
            GpJson::error('VALIDATION', 'Authorization code and state are required from Google.');
        }

        try {
            $res = GoogleOAuthClient::handleCallback($code, $state, $verifier !== '' ? $verifier : null);
        } catch (Throwable $e) {
            error_log('Google OAuth callback exception: ' . $e->getMessage());
            GpJson::error('OAUTH_ERROR', 'Google sign-in could not be completed.', 401);
        }
        if (!$res['ok']) {
            $codeStr = $res['error'] ?? 'OAUTH_ERROR';
            // Never leak internal exception text to the client.
            $safe = match ($codeStr) {
                'INVALID_STATE', 'STATE_EXPIRED' => 'Google sign-in session expired. Please try again.',
                'EMAIL_UNVERIFIED' => 'Verify your Google email before signing in.',
                'ACCOUNT_SUSPENDED' => 'This account is not active.',
                'NOT_CONFIGURED' => 'Google sign-in is not available.',
                default => 'Google sign-in could not be completed.',
            };
            $http = match ($codeStr) {
                'INVALID_STATE', 'STATE_EXPIRED' => 400,
                'EMAIL_UNVERIFIED' => 403,
                'ACCOUNT_SUSPENDED' => 403,
                'NOT_CONFIGURED' => 503,
                default => 401,
            };
            GpJson::error($codeStr, $safe, $http);
        }

        $remember = self::wantRemember($req);
        // Re-issue with requested TTL when GoogleOAuthClient used default encode.
        $user = $res['user'] ?? null;
        $token = (string) ($res['token'] ?? '');
        if ($remember && is_array($user) && $token !== '') {
            $payload = GpJwt::decode($token);
            if (is_array($payload)) {
                unset($payload['iat'], $payload['exp']);
                $token = GpJwt::encode($payload, GpJwt::TTL_REMEMBER);
            }
        }
        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => $user,
            'isNew' => $res['isNew'] ?? false,
            'rememberMe' => $remember,
            'expiresIn' => $remember ? GpJwt::TTL_REMEMBER : GpJwt::TTL_DEFAULT,
        ]);
    }

    /** @return bool */
    private static function wantRemember(GpRequest $req): bool
    {
        $v = $req->input('rememberMe', $req->input('remember_me', false));
        if (is_bool($v)) {
            return $v;
        }
        $s = strtolower(trim((string) $v));
        return in_array($s, ['1', 'true', 'yes', 'on'], true);
    }

    public static function register(GpRequest $req): never
    {
        GpRateLimiter::guard('auth:' . GpRateLimiter::ip(), 8, 300);

        $name = trim((string) $req->input('full_name', $req->input('name', '')));
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 10) {
            GpJson::error('VALIDATION', 'full_name, valid email, and password (10+ chars) are required.');
        }
        $remember = self::wantRemember($req);

        if (GpDb::one('SELECT id FROM gp_merchants WHERE email = ?', [$email])) {
            GpJson::error('EMAIL_TAKEN', 'An account with this email already exists.', 409);
        }

        $now = GpIds::now();
        // Never grant admin/lifetime at signup — only after email verification + allowlist.
        $role = 'merchant';
        $planId = 'trial';
        $merchantId = GpIds::make('mrc', 8);
        $verifyPlain = bin2hex(random_bytes(32));
        $verifyHash = hash('sha256', $verifyPlain);
        $verifyExpires = gmdate('Y-m-d\TH:i:s\Z', time() + 86400);
        $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
        $hashOpts = $algo === PASSWORD_BCRYPT ? ['cost' => 12] : [];

        $pdo = GpDb::pdo();
        $pdo->beginTransaction();

        try {
            GpDb::exec(
                'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, auth_provider,
                 email_verified, email_verify_token_hash, email_verify_expires_at, token_version, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?, ?)',
                [
                    $merchantId,
                    $name,
                    $email,
                    password_hash($password, $algo, $hashOpts),
                    $role,
                    'active',
                    $planId,
                    'local',
                    $verifyHash,
                    $verifyExpires,
                    $now,
                    $now,
                ]
            );

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Account registration transaction failed: ' . $e->getMessage());
            GpJson::error('TRANSACTION_FAILED', 'Account creation could not be completed. Rolled back.', 500);
        }

        $appUrl = rtrim(GpConfig::get('APP_URL', 'https://gresspay.extxcheats.com'), '/');
        $verifyUrl = $appUrl . '/verify-email?token=' . urlencode($verifyPlain) . '&email=' . urlencode($email);
        GpMailer::sendVerifyEmail($email, $name, $verifyUrl);

        $ttl = $remember ? GpJwt::TTL_REMEMBER : GpJwt::TTL_DEFAULT;
        $merchantRow = [
            'merchant_id' => $merchantId,
            'full_name' => $name,
            'email' => $email,
            'role' => $role,
            'status' => 'active',
            'plan_id' => $planId,
            'email_verified' => 0,
            'token_version' => 0,
            'created_at' => $now,
        ];
        $token = GpJwt::issueForMerchant($merchantRow, ['brand' => ''], $ttl);
        $user = GpPresenters::user($merchantRow, ['name' => '', 'brand_id' => '']);

        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => $user,
            'rememberMe' => $remember,
            'expiresIn' => $ttl,
            'emailVerified' => false,
            'note' => 'Check your email to verify your account. Live API keys stay locked until verified.',
        ], 201);
    }

    public static function login(GpRequest $req): never
    {
        GpRateLimiter::guard('login:' . GpRateLimiter::ip(), 12, 300);
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');
        // Failures-only email bucket: reject when already locked without incrementing.
        if ($email !== '') {
            GpRateLimiter::guardIfLimited(GpRateLimiter::emailBucket($email), 5, 900);
        }
        $remember = self::wantRemember($req);
        $row = GpDb::one('SELECT * FROM gp_merchants WHERE email = ?', [$email]);
        if ($row === null) {
            GpRateLimiter::recordLoginFailure($email);
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        }
        if (empty($row['password_hash'])) {
            GpJson::error('SOCIAL_AUTH_ONLY', 'This account was created via Google. Please sign in using Google.', 400);
        }
        if (!password_verify($password, $row['password_hash'])) {
            GpRateLimiter::recordLoginFailure($email);
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        }
        if ($row['status'] !== 'active') {
            GpJson::error('SUSPENDED', 'This account is not active.', 403);
        }
        // Rehash if algorithm/cost drifted.
        $storedHash = (string) $row['password_hash'];
        if (password_needs_rehash($storedHash, defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT, defined('PASSWORD_ARGON2ID') ? [] : ['cost' => 12])) {
            $algo = defined('PASSWORD_ARGON2ID') ? PASSWORD_ARGON2ID : PASSWORD_BCRYPT;
            $opts = $algo === PASSWORD_BCRYPT ? ['cost' => 12] : [];
            GpDb::exec(
                'UPDATE gp_merchants SET password_hash = ?, updated_at = ? WHERE merchant_id = ?',
                [password_hash($password, $algo, $opts), GpIds::now(), $row['merchant_id']]
            );
        }
        $emailVerified = !empty($row['email_verified']);
        $isAdmin = $emailVerified && (GpConfig::isAdmin($row['email']) || (($row['role'] ?? '') === 'admin'));
        if ($isAdmin && (($row['role'] ?? '') !== 'admin' || ($row['plan_id'] ?? '') !== 'lifetime')) {
            GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$row['merchant_id']]);
            $row['role'] = 'admin';
            $row['plan_id'] = 'lifetime';
        }
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$row['merchant_id']]);
        $ttl = $remember ? GpJwt::TTL_REMEMBER : GpJwt::TTL_DEFAULT;
        $token = GpJwt::issueForMerchant(
            $row,
            ['brand' => is_array($brand) ? (string) ($brand['brand_id'] ?? '') : ''],
            $ttl
        );
        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => GpPresenters::user($row, is_array($brand) ? $brand : ['name' => '', 'brand_id' => '']),
            'rememberMe' => $remember,
            'expiresIn' => $ttl,
            'emailVerified' => $emailVerified,
        ]);
    }

    public static function verifyEmail(GpRequest $req): never
    {
        GpRateLimiter::guard('verify-email:' . GpRateLimiter::ip(), 20, 300);
        $email = strtolower(trim((string) $req->input('email', '')));
        $token = trim((string) $req->input('token', ''));
        if ($email === '' || $token === '') {
            GpJson::error('VALIDATION', 'email and token are required.', 400);
        }
        $row = GpDb::one('SELECT * FROM gp_merchants WHERE email = ?', [$email]);
        if ($row === null) {
            GpJson::error('INVALID_TOKEN', 'Verification link is invalid or expired.', 400);
        }
        if (!empty($row['email_verified'])) {
            GpJson::send(['ok' => true, 'emailVerified' => true, 'message' => 'Email already verified.']);
        }
        $expires = strtotime((string) ($row['email_verify_expires_at'] ?? '')) ?: 0;
        $hash = (string) ($row['email_verify_token_hash'] ?? '');
        if ($hash === '' || $expires < time() || !hash_equals($hash, hash('sha256', $token))) {
            GpJson::error('INVALID_TOKEN', 'Verification link is invalid or expired.', 400);
        }
        $now = GpIds::now();
        $isAdmin = GpConfig::isAdmin($email);
        $role = $isAdmin ? 'admin' : ($row['role'] ?? 'merchant');
        $planId = $isAdmin ? 'lifetime' : ($row['plan_id'] ?? 'trial');
        GpDb::exec(
            'UPDATE gp_merchants SET email_verified = 1, email_verified_at = ?, email_verify_token_hash = NULL, email_verify_expires_at = NULL,
             role = ?, plan_id = ?, updated_at = ? WHERE merchant_id = ?',
            [$now, $role, $planId, $now, $row['merchant_id']]
        );
        $row['email_verified'] = 1;
        $row['role'] = $role;
        $row['plan_id'] = $planId;
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$row['merchant_id']]);
        $jwt = GpJwt::issueForMerchant($row, ['brand' => is_array($brand) ? (string) ($brand['brand_id'] ?? '') : '']);
        GpJson::send([
            'ok' => true,
            'emailVerified' => true,
            'token' => $jwt,
            'user' => GpPresenters::user($row, is_array($brand) ? $brand : ['name' => '', 'brand_id' => '']),
        ]);
    }

    public static function resendVerification(GpRequest $req): never
    {
        GpRateLimiter::guard('resend-verify:' . GpRateLimiter::ip(), 5, 900);
        $actor = GpAuth::requireDashboardUser($req);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        if ($merchant === null) {
            GpJson::error('NOT_FOUND', 'Merchant not found.', 404);
        }
        if (!empty($merchant['email_verified'])) {
            GpJson::send(['ok' => true, 'emailVerified' => true, 'message' => 'Already verified.']);
        }
        $plain = bin2hex(random_bytes(32));
        $now = GpIds::now();
        GpDb::exec(
            'UPDATE gp_merchants SET email_verify_token_hash = ?, email_verify_expires_at = ?, updated_at = ? WHERE merchant_id = ?',
            [hash('sha256', $plain), gmdate('Y-m-d\TH:i:s\Z', time() + 86400), $now, $merchant['merchant_id']]
        );
        $appUrl = rtrim(GpConfig::get('APP_URL', 'https://gresspay.extxcheats.com'), '/');
        $verifyUrl = $appUrl . '/verify-email?token=' . urlencode($plain) . '&email=' . urlencode((string) $merchant['email']);
        GpMailer::sendVerifyEmail((string) $merchant['email'], (string) $merchant['full_name'], $verifyUrl);
        GpJson::send(['ok' => true, 'message' => 'Verification email sent.']);
    }

    public static function me(GpRequest $req): never
    {
        if ($req->method !== 'GET') {
            GpJson::error('METHOD_NOT_ALLOWED', 'GET only.', 405);
        }
        $actor = GpAuth::requireActor($req);
        $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
        if ($merchant) {
            $email = strtolower(trim((string) ($merchant['email'] ?? '')));
            $emailVerified = !empty($merchant['email_verified']);
            $isAdmin = $emailVerified && (GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin'));
            if ($isAdmin && (($merchant['role'] ?? '') !== 'admin' || ($merchant['plan_id'] ?? '') !== 'lifetime')) {
                GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$merchant['merchant_id']]);
                $merchant['role'] = 'admin';
                $merchant['plan_id'] = 'lifetime';
            }
        }
        $brand = null;
        if (GpAuth::activeBrandId($actor) !== '') {
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE brand_id = ? AND merchant_id = ?', [$actor['brand_id'], $actor['merchant_id']]);
        }
        if ($brand === null) {
            $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$actor['merchant_id']]);
        }
        GpJson::send(['user' => GpPresenters::user($merchant ?: [], is_array($brand) ? $brand : ['name' => '', 'brand_id' => ''])]);
    }
}

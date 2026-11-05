<?php
declare(strict_types=1);

final class AuthController
{
    public static function handle(GpRequest $req): never
    {
        $action = $req->part(1) ?? '';
        $subAction = $req->part(2) ?? '';

        if ($req->method === 'POST' && $action === 'verify-email') {
            GpRateLimiter::guard('email-verify:' . GpRateLimiter::ip(), 20, 300);
            if (!GpEmailVerification::consume((string) $req->input('token', ''))) GpJson::error('INVALID_TOKEN', 'Verification link is invalid or expired.', 400);
            GpJson::send(['ok' => true, 'message' => 'Email verified. Sign in again.']);
        }
        if ($req->method === 'POST' && $action === 'resend-verification') {
            $actor = GpAuth::requireDashboardUser($req);
            GpRateLimiter::guard('email-resend:' . $actor['merchant_id'], 3, 3600);
            $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
            if (empty($merchant['email_verified'])) {
                try { GpEmailVerification::send($merchant); }
                catch (Throwable $e) { error_log('Verification mail delivery failed.'); GpJson::error('MAIL_UNAVAILABLE', 'Email could not be sent. Please try again later.', 503); }
            }
            GpJson::send(['ok' => true]);
        }
        if ($req->method === 'POST' && in_array($action, ['logout-all','password'], true)) {
            $actor = GpAuth::requireDashboardUser($req);
            if ($action === 'password') {
                GpRateLimiter::guard('password:' . $actor['merchant_id'], 5, 900);
                $merchant = GpDb::one('SELECT * FROM gp_merchants WHERE merchant_id = ?', [$actor['merchant_id']]);
                $password = (string) $req->input('password', '');
                if (strlen($password) < 10 || empty($merchant['password_hash']) || !password_verify((string) $req->input('current_password', ''), $merchant['password_hash'])) GpJson::error('INVALID_CREDENTIALS', 'Current password is incorrect or new password is too short.', 400);
                GpDb::exec('UPDATE gp_merchants SET password_hash = ?, token_version = token_version + 1 WHERE merchant_id = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost'=>12]), $actor['merchant_id']]);
            } else { GpAuth::revokeSessions($actor['merchant_id']); }
            GpJson::send(['ok'=>true]);
        }
        if ($req->method === 'POST' && $action === 'register') {
            self::register($req);
        }
        if ($req->method === 'POST' && $action === 'login') {
            self::login($req);
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

        $res = GoogleOAuthClient::handleCallback($code, $state, $verifier !== '' ? $verifier : null);
        if (!$res['ok']) {
            $codeStr = $res['error'] ?? 'OAUTH_ERROR';
            $msg = $res['message'] ?? 'Google sign-in could not be completed.';
            $http = match ($codeStr) {
                'INVALID_STATE', 'STATE_EXPIRED' => 400,
                'EMAIL_UNVERIFIED' => 403,
                'ACCOUNT_SUSPENDED' => 403,
                'NOT_CONFIGURED' => 503,
                default => 401,
            };
            GpJson::error($codeStr, $msg, $http);
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
        $isAdmin = false; // Local registration never proves ownership of the email.
        $role = $isAdmin ? 'admin' : 'merchant';
        $planId = $isAdmin ? 'lifetime' : 'trial';
        $merchantId = GpIds::make('mrc', 8);

        $pdo = GpDb::pdo();
        $pdo->beginTransaction();

        try {
            GpDb::exec(
                'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, auth_provider, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$merchantId, $name, $email, password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $role, 'active', $planId, 'local', $now, $now]
            );

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Account registration transaction failed: ' . $e->getMessage());
            GpJson::error('TRANSACTION_FAILED', 'Account creation could not be completed. Rolled back.', 500);
        }

        try { GpEmailVerification::send(['merchant_id' => $merchantId, 'email' => $email]); }
        catch (Throwable $e) { error_log('Verification mail delivery failed; resend is available.'); }
        $ttl = $remember ? GpJwt::TTL_REMEMBER : GpJwt::TTL_DEFAULT;
        $token = GpJwt::encode(
            ['sub' => $merchantId, 'brand' => '', 'email' => $email, 'role' => $role, 'is_admin' => $isAdmin, 'plan_id' => $planId],
            $ttl
        );
        $user = GpPresenters::user(
            ['merchant_id' => $merchantId, 'full_name' => $name, 'email' => $email, 'role' => $role, 'status' => 'active', 'plan_id' => $planId, 'created_at' => $now],
            ['name' => '', 'brand_id' => '']
        );

        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => $user,
            'rememberMe' => $remember,
            'expiresIn' => $ttl,
            'note' => 'Create a brand under Dashboard → Brands when you are ready to accept payments.',
        ], 201);
    }

    public static function login(GpRequest $req): never
    {
        GpRateLimiter::guard('login:' . GpRateLimiter::ip(), 12, 300);
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');
        $remember = self::wantRemember($req);
        if (!GpRateLimiter::accountAllowed($email)) {
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect. Try again later.', 429);
        }
        $row = GpDb::one('SELECT * FROM gp_merchants WHERE email = ?', [$email]);
        if ($row === null || empty($row['password_hash']) || !password_verify($password, $row['password_hash'])) {
            GpRateLimiter::loginFailed($email);
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        }
        GpRateLimiter::loginSucceeded($email);
        if (password_needs_rehash($row['password_hash'], PASSWORD_BCRYPT, ['cost' => 12])) {
            GpDb::exec('UPDATE gp_merchants SET password_hash = ? WHERE merchant_id = ? AND password_hash = ?', [password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]), $row['merchant_id'], $row['password_hash']]);
        }
        if ($row['status'] !== 'active') {
            GpJson::error('SUSPENDED', 'This account is not active.', 403);
        }
        $isAdmin = GpConfig::isAdmin($row['email']) || (!empty($row['email_verified']) && ($row['role'] ?? '') === 'admin');
        if ($isAdmin && (($row['role'] ?? '') !== 'admin' || ($row['plan_id'] ?? '') !== 'lifetime')) {
            GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$row['merchant_id']]);
            $row['role'] = 'admin';
            $row['plan_id'] = 'lifetime';
        }
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$row['merchant_id']]);
        $ttl = $remember ? GpJwt::TTL_REMEMBER : GpJwt::TTL_DEFAULT;
        $token = GpJwt::encode([
            'sub' => $row['merchant_id'],
            'brand' => is_array($brand) ? (string) ($brand['brand_id'] ?? '') : '',
            'email' => $row['email'],
            'role' => $isAdmin ? 'admin' : ($row['role'] ?? 'merchant'),
            'is_admin' => $isAdmin,
            'plan_id' => $isAdmin ? 'lifetime' : ($row['plan_id'] ?? 'starter'),
        ], $ttl);
        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => GpPresenters::user($row, is_array($brand) ? $brand : ['name' => '', 'brand_id' => '']),
            'rememberMe' => $remember,
            'expiresIn' => $ttl,
        ]);
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
            $isAdmin = GpConfig::isAdmin($email) || (!empty($merchant['email_verified']) && ($merchant['role'] ?? '') === 'admin');
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
        GpJson::send(['user' => GpPresenters::user($merchant, is_array($brand) ? $brand : ['name' => '', 'brand_id' => ''])]);
    }
}

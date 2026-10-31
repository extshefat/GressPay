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

        GpJson::send([
            'token' => $res['token'],
            'tokenType' => 'Bearer',
            'user' => $res['user'],
            'isNew' => $res['isNew'] ?? false,
        ]);
    }

    public static function register(GpRequest $req): never
    {
        GpRateLimiter::guard('auth:' . GpRateLimiter::ip(), 8, 300);

        $name = trim((string) $req->input('full_name', $req->input('name', '')));
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');
        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            GpJson::error('VALIDATION', 'full_name, valid email, and password (8+ chars) are required.');
        }

        if (GpDb::one('SELECT id FROM gp_merchants WHERE email = ?', [$email])) {
            GpJson::error('EMAIL_TAKEN', 'An account with this email already exists.', 409);
        }

        $now = GpIds::now();
        $isAdmin = GpConfig::isAdmin($email);
        $role = $isAdmin ? 'admin' : 'merchant';
        $planId = $isAdmin ? 'lifetime' : 'trial';
        $merchantId = GpIds::make('mrc', 8);

        $pdo = GpDb::pdo();
        $pdo->beginTransaction();

        try {
            GpDb::exec(
                'INSERT INTO gp_merchants (merchant_id, full_name, email, password_hash, role, status, plan_id, auth_provider, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [$merchantId, $name, $email, password_hash($password, PASSWORD_BCRYPT), $role, 'active', $planId, 'local', $now, $now]
            );

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('Account registration transaction failed: ' . $e->getMessage());
            GpJson::error('TRANSACTION_FAILED', 'Account creation could not be completed. Rolled back.', 500);
        }

        $token = GpJwt::encode(['sub' => $merchantId, 'brand' => '', 'email' => $email, 'role' => $role, 'is_admin' => $isAdmin, 'plan_id' => $planId]);
        $user = GpPresenters::user(
            ['merchant_id' => $merchantId, 'full_name' => $name, 'email' => $email, 'role' => $role, 'status' => 'active', 'plan_id' => $planId, 'created_at' => $now],
            ['name' => '', 'brand_id' => '']
        );

        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => $user,
            'note' => 'Create a brand under Dashboard → Brands when you are ready to accept payments.',
        ], 201);
    }

    public static function login(GpRequest $req): never
    {
        GpRateLimiter::guard('login:' . GpRateLimiter::ip(), 12, 300);
        $email = strtolower(trim((string) $req->input('email', '')));
        $password = (string) $req->input('password', '');
        $row = GpDb::one('SELECT * FROM gp_merchants WHERE email = ?', [$email]);
        if ($row === null) {
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        }
        if (empty($row['password_hash'])) {
            GpJson::error('SOCIAL_AUTH_ONLY', 'This account was created via Google. Please sign in using Google.', 400);
        }
        if (!password_verify($password, $row['password_hash'])) {
            GpJson::error('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
        }
        if ($row['status'] !== 'active') {
            GpJson::error('SUSPENDED', 'This account is not active.', 403);
        }
        $isAdmin = GpConfig::isAdmin($row['email']) || (($row['role'] ?? '') === 'admin');
        if ($isAdmin && (($row['role'] ?? '') !== 'admin' || ($row['plan_id'] ?? '') !== 'lifetime')) {
            GpDb::exec("UPDATE gp_merchants SET role = 'admin', plan_id = 'lifetime' WHERE merchant_id = ?", [$row['merchant_id']]);
            $row['role'] = 'admin';
            $row['plan_id'] = 'lifetime';
        }
        $brand = GpDb::one('SELECT * FROM gp_brands WHERE merchant_id = ? ORDER BY id ASC', [$row['merchant_id']]);
        $token = GpJwt::encode([
            'sub' => $row['merchant_id'],
            'brand' => is_array($brand) ? (string) ($brand['brand_id'] ?? '') : '',
            'email' => $row['email'],
            'role' => $isAdmin ? 'admin' : ($row['role'] ?? 'merchant'),
            'is_admin' => $isAdmin,
            'plan_id' => $isAdmin ? 'lifetime' : ($row['plan_id'] ?? 'starter'),
        ]);
        GpJson::send([
            'token' => $token,
            'tokenType' => 'Bearer',
            'user' => GpPresenters::user($row, is_array($brand) ? $brand : ['name' => '', 'brand_id' => '']),
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
            $isAdmin = GpConfig::isAdmin($email) || (($merchant['role'] ?? '') === 'admin');
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

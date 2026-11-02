<?php
declare(strict_types=1);

final class TeamController
{
    public static function handle(GpRequest $req): never
    {
        $actor = GpAuth::requireDashboardUser($req);
        $a = $req->part(1);
        $b = $req->part(2);

        if ($req->method === 'GET' && $a === null) {
            self::list($actor);
        }
        if ($req->method === 'GET' && $a === 'me' && $b === null) {
            self::me($actor);
        }
        if ($req->method === 'POST' && $a === 'invites' && $b === null) {
            self::createInvite($actor, $req);
        }
        if ($req->method === 'POST' && $a === 'accept' && $b === null) {
            self::acceptInvite($actor, $req);
        }
        if ($req->method === 'POST' && $a === 'invites' && $b !== null && $req->part(3) === 'revoke') {
            self::revokeInvite($actor, $b);
        }
        if ($req->method === 'PATCH' && $a === 'members' && $b !== null) {
            self::updateMember($actor, $b, $req);
        }
        if ($req->method === 'DELETE' && $a === 'members' && $b !== null) {
            self::revokeMember($actor, $b);
        }
        GpJson::error('NOT_FOUND', 'Unknown team route.', 404);
    }

    /** Owner workspace merchant id (staff cannot manage team). */
    private static function ownerMerchantId(array $actor): string
    {
        if (!empty($actor['team_member_id'])) {
            GpJson::error('FORBIDDEN', 'Only the workspace owner can manage the team.', 403);
        }
        return (string) $actor['merchant_id'];
    }

    /** @param array<string,mixed> $actor */
    private static function me(array $actor): never
    {
        if (!empty($actor['team_member_id'])) {
            GpJson::send([
                'isWorkspaceOwner' => false,
                'teamMemberId' => $actor['team_member_id'],
                'teamRole' => $actor['team_role'] ?? null,
                'workspaceMerchantId' => $actor['workspace_merchant_id'] ?? null,
                'allowedBrandIds' => $actor['allowed_brand_ids'] ?? [],
                'permissions' => $actor['permissions'] ?? GpTeam::defaultPermissions((string) ($actor['team_role'] ?? 'manager')),
            ]);
        }
        GpJson::send([
            'isWorkspaceOwner' => true,
            'teamMemberId' => null,
            'teamRole' => 'owner',
            'workspaceMerchantId' => $actor['merchant_id'],
            'allowedBrandIds' => null,
            'permissions' => null,
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function list(array $actor): never
    {
        $ownerId = self::ownerMerchantId($actor);
        $rows = GpDb::all(
            'SELECT * FROM gp_team_members WHERE owner_merchant_id = ? ORDER BY id DESC LIMIT 200',
            [$ownerId]
        );
        $out = [];
        $active = 0;
        $invited = 0;
        foreach ($rows as $row) {
            $status = (string) ($row['status'] ?? '');
            if ($status === 'active') {
                $active++;
            }
            if ($status === 'invited') {
                $invited++;
            }
            $memberId = (string) $row['member_id'];
            $perms = json_decode((string) ($row['permissions_json'] ?? '{}'), true);
            $out[] = [
                'memberId' => $memberId,
                'email' => $row['email'],
                'role' => $row['role'],
                'status' => $status,
                'userMerchantId' => $row['user_merchant_id'] ?? null,
                'brandIds' => GpTeam::brandIdsForMember($memberId),
                'permissions' => GpTeam::normalizePermissions(is_array($perms) ? $perms : null, (string) $row['role']),
                'createdAt' => $row['created_at'] ?? null,
                'updatedAt' => $row['updated_at'] ?? null,
            ];
        }
        GpJson::send([
            'members' => $out,
            'stats' => [
                'total' => count($out),
                'active' => $active,
                'invited' => $invited,
                'limit' => 100,
            ],
            'modules' => GpTeam::MODULES,
            'roleDefaults' => ['manager' => GpTeam::defaultPermissions('manager'), 'support' => GpTeam::defaultPermissions('support')],
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function createInvite(array $actor, GpRequest $req): never
    {
        $ownerId = self::ownerMerchantId($actor);
        GpRateLimiter::guard('team-invite:' . $ownerId, 20, 60);

        $email = strtolower(trim((string) $req->input('email', '')));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            GpJson::error('INVALID_EMAIL', 'A valid team member email is required.', 400);
        }
        if (strtolower((string) ($actor['email'] ?? '')) === $email) {
            GpJson::error('INVALID_EMAIL', 'You cannot invite your own owner email.', 400);
        }

        $count = (int) (GpDb::one(
            "SELECT COUNT(*) AS c FROM gp_team_members WHERE owner_merchant_id = ? AND status IN ('invited','active')",
            [$ownerId]
        )['c'] ?? 0);
        if ($count >= 100) {
            GpJson::error('QUOTA', 'Team member limit reached (100).', 400);
        }

        $existing = GpDb::one(
            "SELECT member_id, status FROM gp_team_members WHERE owner_merchant_id = ? AND LOWER(email) = ?",
            [$ownerId, $email]
        );
        if (is_array($existing) && in_array((string) $existing['status'], ['invited', 'active'], true)) {
            GpJson::error('EXISTS', 'That email is already invited or active on this team.', 409);
        }

        $role = strtolower(trim((string) $req->input('role', 'manager')));
        if (!in_array($role, ['manager', 'support'], true)) {
            GpJson::error('INVALID_ROLE', 'role must be manager or support.', 400);
        }
        $permsIn = $req->input('permissions', null);
        $permissions = GpTeam::normalizePermissions(is_array($permsIn) ? $permsIn : null, $role);

        $brandIds = $req->input('brandIds', $req->input('brand_ids', []));
        if (!is_array($brandIds)) {
            $brandIds = [];
        }
        $brandIds = array_values(array_unique(array_filter(array_map('strval', $brandIds))));
        if ($brandIds === []) {
            GpJson::error('MISSING_BRANDS', 'Select at least one brand the member can access.', 400);
        }
        foreach ($brandIds as $bid) {
            $b = GpDb::one(
                'SELECT brand_id FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                [$bid, $ownerId]
            );
            if ($b === null) {
                GpJson::error('NOT_FOUND', 'Brand not found in your workspace: ' . $bid, 404);
            }
        }

        $now = GpIds::now();
        $memberId = 'tm_' . bin2hex(random_bytes(8));
        $inviteId = 'ti_' . bin2hex(random_bytes(8));
        $token = bin2hex(random_bytes(24));
        $tokenHash = hash('sha256', $token);
        $expires = gmdate('Y-m-d\TH:i:s\Z', time() + 7 * 86400);

        // Revive revoked row or insert fresh.
        if (is_array($existing) && (string) ($existing['status'] ?? '') === 'revoked') {
            $memberId = (string) $existing['member_id'];
            GpDb::exec(
                'UPDATE gp_team_members SET role = ?, status = ?, permissions_json = ?, user_merchant_id = NULL, updated_at = ? WHERE member_id = ?',
                [$role, 'invited', json_encode($permissions, JSON_UNESCAPED_SLASHES), $now, $memberId]
            );
            GpDb::exec('DELETE FROM gp_team_member_brands WHERE member_id = ?', [$memberId]);
            GpDb::exec('DELETE FROM gp_team_invites WHERE member_id = ?', [$memberId]);
        } else {
            GpDb::exec(
                'INSERT INTO gp_team_members (member_id, owner_merchant_id, email, user_merchant_id, role, status, permissions_json, created_at, updated_at)
                 VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)',
                [
                    $memberId,
                    $ownerId,
                    $email,
                    $role,
                    'invited',
                    json_encode($permissions, JSON_UNESCAPED_SLASHES),
                    $now,
                    $now,
                ]
            );
        }

        foreach ($brandIds as $bid) {
            GpDb::exec(
                'INSERT INTO gp_team_member_brands (member_id, brand_id, created_at) VALUES (?, ?, ?)',
                [$memberId, $bid, $now]
            );
        }

        GpDb::exec(
            'INSERT INTO gp_team_invites (invite_id, member_id, token_hash, expires_at, accepted_at, created_at)
             VALUES (?, ?, ?, ?, NULL, ?)',
            [$inviteId, $memberId, $tokenHash, $expires, $now]
        );

        $app = rtrim(GpConfig::get('PUBLIC_APP_URL', GpConfig::get('APP_URL', '')), '/');
        $acceptUrl = ($app !== '' ? $app : '') . '/dashboard/team?accept=' . urlencode($token);

        GpJson::send([
            'ok' => true,
            'memberId' => $memberId,
            'inviteId' => $inviteId,
            'email' => $email,
            'role' => $role,
            'brandIds' => $brandIds,
            'permissions' => $permissions,
            'expiresAt' => $expires,
            'acceptUrl' => $acceptUrl,
            'emailDelivery' => 'manual_copy',
            'note' => 'Copy the accept URL and share it with the teammate. They must sign in with this email, then open the link (or Team → Accept).',
        ], 201);
    }

    /** @param array<string,mixed> $actor */
    private static function acceptInvite(array $actor, GpRequest $req): never
    {
        $token = trim((string) $req->input('token', $req->input('acceptToken', '')));
        if ($token === '') {
            GpJson::error('MISSING_TOKEN', 'Invite token is required.', 400);
        }
        $hash = hash('sha256', $token);
        $invite = GpDb::one(
            'SELECT * FROM gp_team_invites WHERE token_hash = ? ORDER BY id DESC',
            [$hash]
        );
        if ($invite === null) {
            GpJson::error('NOT_FOUND', 'Invite not found or already used.', 404);
        }
        if (!empty($invite['accepted_at'])) {
            GpJson::error('USED', 'This invite was already accepted.', 409);
        }
        $exp = strtotime((string) ($invite['expires_at'] ?? ''));
        if ($exp !== false && $exp < time()) {
            GpJson::error('EXPIRED', 'This invite has expired. Ask the owner to send a new one.', 410);
        }
        $member = GpDb::one(
            'SELECT * FROM gp_team_members WHERE member_id = ?',
            [$invite['member_id']]
        );
        if ($member === null || (string) ($member['status'] ?? '') === 'revoked') {
            GpJson::error('REVOKED', 'This invite is no longer valid.', 410);
        }
        $actorEmail = strtolower(trim((string) ($actor['email'] ?? '')));
        $inviteEmail = strtolower(trim((string) ($member['email'] ?? '')));
        if ($actorEmail === '' || $actorEmail !== $inviteEmail) {
            GpJson::error(
                'EMAIL_MISMATCH',
                'Sign in with ' . $inviteEmail . ' to accept this team invite.',
                403
            );
        }
        $now = GpIds::now();
        GpDb::exec(
            "UPDATE gp_team_members SET status = 'active', user_merchant_id = ?, updated_at = ? WHERE member_id = ?",
            [$actor['staff_user_merchant_id'] ?? $actor['merchant_id'], $now, $member['member_id']]
        );
        GpDb::exec(
            'UPDATE gp_team_invites SET accepted_at = ? WHERE invite_id = ?',
            [$now, $invite['invite_id']]
        );
        GpJson::send([
            'ok' => true,
            'memberId' => $member['member_id'],
            'ownerMerchantId' => $member['owner_merchant_id'],
            'brandIds' => GpTeam::brandIdsForMember((string) $member['member_id']),
            'role' => $member['role'],
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function revokeInvite(array $actor, string $inviteId): never
    {
        $ownerId = self::ownerMerchantId($actor);
        $invite = GpDb::one('SELECT * FROM gp_team_invites WHERE invite_id = ?', [$inviteId]);
        if ($invite === null) {
            GpJson::error('NOT_FOUND', 'Invite not found.', 404);
        }
        $member = GpDb::one(
            'SELECT * FROM gp_team_members WHERE member_id = ? AND owner_merchant_id = ?',
            [$invite['member_id'], $ownerId]
        );
        if ($member === null) {
            GpJson::error('NOT_FOUND', 'Invite not found.', 404);
        }
        $now = GpIds::now();
        GpDb::exec(
            "UPDATE gp_team_members SET status = 'revoked', updated_at = ? WHERE member_id = ?",
            [$now, $member['member_id']]
        );
        GpJson::send(['ok' => true, 'memberId' => $member['member_id'], 'status' => 'revoked']);
    }

    /** @param array<string,mixed> $actor */
    private static function updateMember(array $actor, string $memberId, GpRequest $req): never
    {
        $ownerId = self::ownerMerchantId($actor);
        $member = GpDb::one(
            'SELECT * FROM gp_team_members WHERE member_id = ? AND owner_merchant_id = ?',
            [$memberId, $ownerId]
        );
        if ($member === null) {
            GpJson::error('NOT_FOUND', 'Team member not found.', 404);
        }
        $role = strtolower(trim((string) $req->input('role', $member['role'])));
        if (!in_array($role, ['manager', 'support'], true)) {
            GpJson::error('INVALID_ROLE', 'role must be manager or support.', 400);
        }
        $permsIn = $req->input('permissions', null);
        $permissions = is_array($permsIn)
            ? GpTeam::normalizePermissions($permsIn, $role)
            : GpTeam::normalizePermissions(
                $role === $member['role'] ? (json_decode((string) ($member['permissions_json'] ?? '{}'), true) ?: null) : null,
                $role
            );

        $now = GpIds::now();
        GpDb::exec(
            'UPDATE gp_team_members SET role = ?, permissions_json = ?, updated_at = ? WHERE member_id = ?',
            [$role, json_encode($permissions, JSON_UNESCAPED_SLASHES), $now, $memberId]
        );

        if ($req->input('brandIds', $req->input('brand_ids', null)) !== null) {
            $brandIds = $req->input('brandIds', $req->input('brand_ids', []));
            if (!is_array($brandIds) || $brandIds === []) {
                GpJson::error('MISSING_BRANDS', 'Select at least one brand.', 400);
            }
            $brandIds = array_values(array_unique(array_filter(array_map('strval', $brandIds))));
            foreach ($brandIds as $bid) {
                $b = GpDb::one(
                    'SELECT brand_id FROM gp_brands WHERE brand_id = ? AND merchant_id = ?',
                    [$bid, $ownerId]
                );
                if ($b === null) {
                    GpJson::error('NOT_FOUND', 'Brand not found: ' . $bid, 404);
                }
            }
            GpDb::exec('DELETE FROM gp_team_member_brands WHERE member_id = ?', [$memberId]);
            foreach ($brandIds as $bid) {
                GpDb::exec(
                    'INSERT INTO gp_team_member_brands (member_id, brand_id, created_at) VALUES (?, ?, ?)',
                    [$memberId, $bid, $now]
                );
            }
        }

        GpJson::send([
            'ok' => true,
            'memberId' => $memberId,
            'role' => $role,
            'permissions' => $permissions,
            'brandIds' => GpTeam::brandIdsForMember($memberId),
        ]);
    }

    /** @param array<string,mixed> $actor */
    private static function revokeMember(array $actor, string $memberId): never
    {
        $ownerId = self::ownerMerchantId($actor);
        $member = GpDb::one(
            'SELECT * FROM gp_team_members WHERE member_id = ? AND owner_merchant_id = ?',
            [$memberId, $ownerId]
        );
        if ($member === null) {
            GpJson::error('NOT_FOUND', 'Team member not found.', 404);
        }
        GpDb::exec(
            "UPDATE gp_team_members SET status = 'revoked', updated_at = ? WHERE member_id = ?",
            [GpIds::now(), $memberId]
        );
        GpJson::send(['ok' => true, 'memberId' => $memberId, 'status' => 'revoked']);
    }
}

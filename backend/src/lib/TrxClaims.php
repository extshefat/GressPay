<?php
declare(strict_types=1);

final class GpTrxClaims
{
    /** Must be called inside the settlement transaction; rolled back with failed settlement. */
    public static function claim(string $brandId, string $mode, string $trxId, string $sessionId): bool
    {
        if ($trxId === '') return true;
        $sql = GpDb::driver() === 'mysql'
            ? 'INSERT INTO gp_trx_claims (brand_id,ledger_mode,trx_id,session_id) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE session_id = session_id'
            : 'INSERT INTO gp_trx_claims (brand_id,ledger_mode,trx_id,session_id) VALUES (?,?,?,?) ON CONFLICT (brand_id,ledger_mode,trx_id) DO NOTHING';
        GpDb::exec($sql,[$brandId,$mode,strtoupper(trim($trxId)),$sessionId]);
        $row=GpDb::one('SELECT session_id FROM gp_trx_claims WHERE brand_id = ? AND ledger_mode = ? AND trx_id = ?',[$brandId,$mode,strtoupper(trim($trxId))]);
        return $row !== null && $row['session_id'] === $sessionId;
    }
}

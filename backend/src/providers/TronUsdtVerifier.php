<?php
declare(strict_types=1);

/**
 * Verify USDT TRC-20 transfers via TronGrid (or configured TRON_API_BASE).
 * Never complete from a pasted hash alone — always fetch chain state.
 *
 * Amounts compared in integer micro-USDT (6 decimals) via BCMath.
 * Addresses compared as canonical Base58Check (T…).
 */
final class TronUsdtVerifier
{
    private const USDT_DECIMALS = 6;

    /**
     * @return array{
     *   ok:bool,
     *   pending?:bool,
     *   error?:string,
     *   amount?:string,
     *   to?:string,
     *   contract?:string,
     *   confirmations?:int,
     *   block?:int,
     *   txid?:string
     * }
     */
    public static function verify(string $txid, string $expectedTo, string $expectedAmountHuman): array
    {
        $txid = strtolower(trim($txid));
        if (!preg_match('/^[a-f0-9]{64}$/', $txid)) {
            return ['ok' => false, 'error' => 'invalid_txid_format'];
        }

        $expectedTo = self::normalizeBase58($expectedTo);
        if ($expectedTo === '' || !str_starts_with($expectedTo, 'T')) {
            return ['ok' => false, 'error' => 'merchant_address_missing'];
        }

        $expectedContract = self::normalizeBase58(GpConfig::usdtTrc20Contract());
        $expectedMicro = self::toMicroUnits($expectedAmountHuman);

        // Primary: TronGrid events API (Base58 contract + to).
        $events = self::fetchGet('/v1/transactions/' . $txid . '/events');
        $transfer = self::parseEventsUsdt($events, $expectedContract);

        $info = self::fetchJson('/wallet/gettransactioninfobyid', ['value' => $txid]);
        if ($info === null && $transfer === null) {
            return ['ok' => false, 'error' => 'provider_unreachable'];
        }

        if ($info !== null) {
            if (empty($info['id']) && empty($info['txid']) && empty($info['blockNumber']) && $transfer === null) {
                return ['ok' => false, 'pending' => true, 'error' => 'tx_not_found'];
            }
            $receipt = $info['receipt'] ?? [];
            $result = strtoupper((string) ($receipt['result'] ?? $info['result'] ?? 'SUCCESS'));
            if ($result !== '' && $result !== 'SUCCESS' && $result !== 'SUCCESSFUL') {
                return ['ok' => false, 'error' => 'tx_failed'];
            }
            if ($transfer === null) {
                $transfer = self::parseUsdtTransferLogs($info, $expectedContract);
            }
        }

        if ($transfer === null) {
            return ['ok' => false, 'pending' => true, 'error' => 'not_usdt_transfer'];
        }

        if (self::normalizeBase58($transfer['contract']) !== $expectedContract) {
            return ['ok' => false, 'error' => 'wrong_contract'];
        }
        if (self::normalizeBase58($transfer['to']) !== $expectedTo) {
            return ['ok' => false, 'error' => 'wrong_recipient'];
        }

        $gotMicro = $transfer['amount_micro'];
        if (!function_exists('bccomp') || bccomp($gotMicro, $expectedMicro, 0) !== 0) {
            if (function_exists('bccomp')) {
                return [
                    'ok' => false,
                    'error' => 'amount_mismatch',
                    'amount' => self::fromMicroUnits($gotMicro),
                ];
            }
            // Without BCMath, refuse rather than float-compare.
            return ['ok' => false, 'error' => 'amount_compare_unavailable'];
        }

        $block = (int) ($info['blockNumber'] ?? $transfer['block'] ?? 0);
        $confirmations = 0;
        if ($block > 0) {
            $nowBlock = self::latestBlock();
            if ($nowBlock > 0) {
                $confirmations = max(0, $nowBlock - $block);
            }
        }
        $need = GpConfig::usdtConfirmations();
        if ($confirmations < $need) {
            return [
                'ok' => false,
                'pending' => true,
                'error' => 'insufficient_confirmations',
                'confirmations' => $confirmations,
                'amount' => self::fromMicroUnits($gotMicro),
                'to' => $transfer['to'],
                'contract' => $transfer['contract'],
                'block' => $block,
                'txid' => $txid,
            ];
        }

        return [
            'ok' => true,
            'amount' => self::fromMicroUnits($gotMicro),
            'to' => $transfer['to'],
            'contract' => $transfer['contract'],
            'confirmations' => $confirmations,
            'block' => $block,
            'txid' => $txid,
        ];
    }

    /** Human decimal USDT → integer micro-units string. */
    public static function toMicroUnits(string $human): string
    {
        $human = GpMoney::sanitize($human, self::USDT_DECIMALS);
        if (!function_exists('bcmul')) {
            return (string) (int) round(((float) $human) * (10 ** self::USDT_DECIMALS));
        }
        return bcmul($human, bcpow('10', (string) self::USDT_DECIMALS, 0), 0);
    }

    public static function fromMicroUnits(string $micro): string
    {
        if (!function_exists('bcdiv')) {
            return number_format(((float) $micro) / (10 ** self::USDT_DECIMALS), self::USDT_DECIMALS, '.', '');
        }
        return bcdiv($micro, bcpow('10', (string) self::USDT_DECIMALS, 0), self::USDT_DECIMALS);
    }

    public static function normalizeBase58(string $addr): string
    {
        $addr = trim($addr);
        if ($addr === '') {
            return '';
        }
        // Already Base58 TRON address
        if (preg_match('/^T[1-9A-HJ-NP-Za-km-z]{33}$/', $addr)) {
            return $addr;
        }
        // Hex 20-byte (or 21-byte with 41 prefix)
        $hex = strtolower(ltrim($addr, '0x'));
        if (strlen($hex) === 40) {
            return self::hex20ToBase58($hex);
        }
        if (strlen($hex) === 42 && str_starts_with($hex, '41')) {
            return self::hex21ToBase58($hex);
        }
        return '';
    }

    /** Convert 20-byte address hex to Base58Check with 0x41 prefix. */
    public static function hex20ToBase58(string $hex20): string
    {
        $hex20 = strtolower(preg_replace('/[^0-9a-f]/', '', $hex20) ?? '');
        if (strlen($hex20) !== 40) {
            return '';
        }
        return self::hex21ToBase58('41' . $hex20);
    }

    public static function hex21ToBase58(string $hex21): string
    {
        $hex21 = strtolower(preg_replace('/[^0-9a-f]/', '', $hex21) ?? '');
        if (strlen($hex21) !== 42 || !str_starts_with($hex21, '41')) {
            return '';
        }
        $bin = hex2bin($hex21);
        if ($bin === false) {
            return '';
        }
        $hash0 = hash('sha256', $bin, true);
        $hash1 = hash('sha256', $hash0, true);
        $checksum = substr($hash1, 0, 4);
        return self::base58Encode($bin . $checksum);
    }

    private static function base58Encode(string $data): string
    {
        $alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        $bytes = array_values(unpack('C*', $data) ?: []);
        $zeros = 0;
        foreach ($bytes as $b) {
            if ($b === 0) {
                $zeros++;
            } else {
                break;
            }
        }
        $digits = [0];
        foreach ($bytes as $byte) {
            $carry = $byte;
            for ($i = 0, $len = count($digits); $i < $len; $i++) {
                $carry += $digits[$i] << 8;
                $digits[$i] = $carry % 58;
                $carry = intdiv($carry, 58);
            }
            while ($carry > 0) {
                $digits[] = $carry % 58;
                $carry = intdiv($carry, 58);
            }
        }
        $out = str_repeat('1', $zeros);
        for ($i = count($digits) - 1; $i >= 0; $i--) {
            $out .= $alphabet[$digits[$i]];
        }
        return $out;
    }

    /**
     * @param array<string,mixed> $info
     * @return array{to:string,amount_micro:string,contract:string,block?:int}|null
     */
    private static function parseUsdtTransferLogs(array $info, string $expectedContractBase58): ?array
    {
        $logs = $info['log'] ?? [];
        if (!is_array($logs)) {
            return null;
        }
        $topic = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
        $expectedHex21 = '';
        // Decode expected Base58 → hex for log.address compare (Tron logs use 41||20bytes hex without 0x sometimes)
        $expectedHex21 = self::base58ToHex21($expectedContractBase58);

        foreach ($logs as $log) {
            if (!is_array($log)) {
                continue;
            }
            $addrHex = strtolower(ltrim((string) ($log['address'] ?? ''), '0x'));
            if ($expectedHex21 !== '') {
                $addrNorm = strlen($addrHex) === 40 ? '41' . $addrHex : $addrHex;
                if ($addrNorm !== $expectedHex21) {
                    continue; // wrong contract
                }
            } else {
                continue;
            }
            $topics = $log['topics'] ?? [];
            if (!is_array($topics) || count($topics) < 3) {
                continue;
            }
            $t0 = strtolower(ltrim((string) $topics[0], '0x'));
            if ($t0 !== $topic) {
                continue;
            }
            $toHex = substr(strtolower(ltrim((string) $topics[2], '0x')), -40);
            $toB58 = self::hex20ToBase58($toHex);
            if ($toB58 === '') {
                continue;
            }
            $data = ltrim((string) ($log['data'] ?? '0'), '0x');
            if ($data === '') {
                $data = '0';
            }
            if (!function_exists('gmp_init')) {
                continue;
            }
            $raw = gmp_strval(gmp_init($data, 16), 10);
            return [
                'to' => $toB58,
                'amount_micro' => $raw,
                'contract' => $expectedContractBase58,
                'block' => (int) ($info['blockNumber'] ?? 0),
            ];
        }
        return null;
    }

    /** @param array<string,mixed>|null $events */
    private static function parseEventsUsdt(?array $events, string $expectedContractBase58): ?array
    {
        if ($events === null) {
            return null;
        }
        $data = $events['data'] ?? $events;
        if (!is_array($data)) {
            return null;
        }
        foreach ($data as $ev) {
            if (!is_array($ev)) {
                continue;
            }
            $name = (string) ($ev['event_name'] ?? $ev['eventName'] ?? '');
            if (strcasecmp($name, 'Transfer') !== 0) {
                continue;
            }
            $contract = self::normalizeBase58((string) ($ev['contract_address'] ?? $ev['contractAddress'] ?? ''));
            if ($contract === '' || $contract !== $expectedContractBase58) {
                continue;
            }
            $result = $ev['result'] ?? [];
            if (!is_array($result)) {
                continue;
            }
            $to = self::normalizeBase58((string) ($result['to'] ?? $result['1'] ?? ''));
            $value = (string) ($result['value'] ?? $result['2'] ?? '');
            if ($to === '' || $value === '') {
                continue;
            }
            // Events usually give integer smallest units
            if (str_contains($value, '.')) {
                $micro = self::toMicroUnits($value);
            } else {
                $micro = preg_replace('/\D/', '', $value) ?: '0';
            }
            return [
                'to' => $to,
                'amount_micro' => $micro,
                'contract' => $contract,
                'block' => (int) ($ev['block_number'] ?? $ev['blockNumber'] ?? 0),
            ];
        }
        return null;
    }

    public static function base58ToHex21(string $address): string
    {
        $alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        $address = trim($address);
        if ($address === '') {
            return '';
        }
        $bytes = [0];
        for ($i = 0, $len = strlen($address); $i < $len; $i++) {
            $pos = strpos($alphabet, $address[$i]);
            if ($pos === false) {
                return '';
            }
            $carry = $pos;
            for ($j = 0, $bl = count($bytes); $j < $bl; $j++) {
                $carry += $bytes[$j] * 58;
                $bytes[$j] = $carry & 0xff;
                $carry >>= 8;
            }
            while ($carry > 0) {
                $bytes[] = $carry & 0xff;
                $carry >>= 8;
            }
        }
        for ($i = 0, $len = strlen($address); $i < $len && $address[$i] === '1'; $i++) {
            $bytes[] = 0;
        }
        $bytes = array_reverse($bytes);
        $bin = pack('C*', ...$bytes);
        if (strlen($bin) < 25) {
            $bin = str_repeat("\0", 25 - strlen($bin)) . $bin;
        }
        $payload = substr($bin, 0, -4);
        $checksum = substr($bin, -4);
        $hash0 = hash('sha256', $payload, true);
        $hash1 = hash('sha256', $hash0, true);
        if (substr($hash1, 0, 4) !== $checksum) {
            return '';
        }
        return bin2hex($payload);
    }

    private static function latestBlock(): int
    {
        $j = self::fetchGet('/wallet/getnowblock');
        if ($j === null) {
            $j = self::fetchJson('/wallet/getnowblock', new stdClass());
        }
        if ($j === null) {
            return 0;
        }
        return (int) ($j['block_header']['raw_data']['number'] ?? 0);
    }

    /** @return array<string,mixed>|null */
    private static function fetchJson(string $path, mixed $body): ?array
    {
        $url = GpConfig::tronApiBase() . $path;
        if (!function_exists('curl_init')) {
            return null;
        }
        $headers = ['Content-Type: application/json', 'Accept: application/json'];
        $key = GpConfig::tronApiKey();
        if ($key !== '') {
            $headers[] = 'TRON-PRO-API-KEY: ' . $key;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($body),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : null;
    }

    /** @return array<string,mixed>|null */
    private static function fetchGet(string $path): ?array
    {
        $url = GpConfig::tronApiBase() . $path;
        if (!function_exists('curl_init')) {
            return null;
        }
        $headers = ['Accept: application/json'];
        $key = GpConfig::tronApiKey();
        if ($key !== '') {
            $headers[] = 'TRON-PRO-API-KEY: ' . $key;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTPGET => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        if ($raw === false) {
            return null;
        }
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : null;
    }
}

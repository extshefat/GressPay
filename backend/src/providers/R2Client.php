<?php
declare(strict_types=1);

/**
 * Cloudflare R2 (S3-compatible) client — SigV4 presign + HEAD/DELETE.
 * Credentials never leave the server. No Composer dependency.
 */
final class R2Client
{
    public static function isConfigured(): bool
    {
        return GpConfig::r2Configured();
    }

    /**
     * @return array{url:string,headers:array<string,string>,objectKey:string,expiresIn:int}
     */
    public static function presignPut(string $objectKey, string $contentType, int $ttlSeconds = 0): array
    {
        self::requireConfigured();
        $ttl = $ttlSeconds > 0 ? $ttlSeconds : GpConfig::r2PresignTtl();
        $headers = ['Content-Type' => $contentType];
        $url = self::presign('PUT', $objectKey, $ttl, $headers);
        return [
            'url' => $url,
            'headers' => $headers,
            'objectKey' => $objectKey,
            'expiresIn' => $ttl,
        ];
    }

    public static function presignGet(string $objectKey, int $ttlSeconds = 0): string
    {
        self::requireConfigured();
        $ttl = $ttlSeconds > 0 ? $ttlSeconds : GpConfig::r2PresignTtl();
        return self::presign('GET', $objectKey, $ttl, []);
    }

    /**
     * @return array{ok:bool,contentType?:string,contentLength?:int,etag?:string,error?:string}
     */
    public static function headObject(string $objectKey): array
    {
        if (!self::isConfigured()) {
            return ['ok' => false, 'error' => 'r2_not_configured'];
        }
        $url = self::signedRequestUrl('HEAD', $objectKey);
        if (!function_exists('curl_init')) {
            return ['ok' => false, 'error' => 'curl_missing'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_NOBODY => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HEADER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $raw = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($raw === false || $code < 200 || $code >= 300) {
            return ['ok' => false, 'error' => 'object_not_found', 'http' => $code];
        }
        $ctype = '';
        $clen = 0;
        $etag = '';
        foreach (explode("\r\n", (string) $raw) as $line) {
            if (stripos($line, 'Content-Type:') === 0) {
                $ctype = trim(substr($line, 13));
            }
            if (stripos($line, 'Content-Length:') === 0) {
                $clen = (int) trim(substr($line, 15));
            }
            if (stripos($line, 'ETag:') === 0) {
                $etag = trim(substr($line, 5), " \t\"");
            }
        }
        return [
            'ok' => true,
            'contentType' => $ctype,
            'contentLength' => $clen,
            'etag' => $etag,
        ];
    }

    public static function deleteObject(string $objectKey): bool
    {
        if (!self::isConfigured() || $objectKey === '') {
            return false;
        }
        $url = self::signedRequestUrl('DELETE', $objectKey);
        if (!function_exists('curl_init')) {
            return false;
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => 'DELETE',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $code >= 200 && $code < 300;
    }

    /** Detect PNG/JPEG/WebP from magic bytes. */
    public static function detectImageMime(string $bytes): ?string
    {
        $len = strlen($bytes);
        if ($len >= 3 && strncmp($bytes, "\xFF\xD8\xFF", 3) === 0) {
            return 'image/jpeg';
        }
        if ($len >= 8 && strncmp($bytes, "\x89PNG\r\n\x1a\n", 8) === 0) {
            return 'image/png';
        }
        if ($len >= 12 && strncmp($bytes, 'RIFF', 4) === 0 && substr($bytes, 8, 4) === 'WEBP') {
            return 'image/webp';
        }
        return null;
    }

    public static function extensionForMime(string $mime): string
    {
        return match ($mime) {
            'image/png' => 'png',
            'image/jpeg' => 'jpg',
            'image/webp' => 'webp',
            default => 'bin',
        };
    }

    private static function requireConfigured(): void
    {
        if (!self::isConfigured()) {
            throw new RuntimeException('R2 is not configured');
        }
    }

    /** @param array<string,string> $signedHeaders */
    private static function presign(string $method, string $objectKey, int $ttl, array $signedHeaders): string
    {
        $endpoint = GpConfig::r2Endpoint();
        $bucket = GpConfig::r2Bucket();
        $accessKey = GpConfig::r2AccessKeyId();
        $secret = GpConfig::r2SecretAccessKey();
        $region = 'auto';
        $service = 's3';
        $host = parse_url($endpoint, PHP_URL_HOST) ?: '';
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $amzDate = $now->format('Ymd\THis\Z');
        $dateStamp = $now->format('Ymd');
        $credentialScope = $dateStamp . '/' . $region . '/' . $service . '/aws4_request';
        $credential = $accessKey . '/' . $credentialScope;

        $canonicalUri = '/' . rawurlencode($bucket) . '/' . self::encodeKey($objectKey);
        // S3 style path: /bucket/key — R2 accepts path-style.
        $canonicalUri = '/' . $bucket . '/' . self::encodeKey($objectKey);

        $query = [
            'X-Amz-Algorithm' => 'AWS4-HMAC-SHA256',
            'X-Amz-Credential' => $credential,
            'X-Amz-Date' => $amzDate,
            'X-Amz-Expires' => (string) $ttl,
            'X-Amz-SignedHeaders' => 'host' . (isset($signedHeaders['Content-Type']) ? ';content-type' : ''),
        ];
        ksort($query);
        $canonicalQuery = [];
        foreach ($query as $k => $v) {
            $canonicalQuery[] = rawurlencode($k) . '=' . rawurlencode($v);
        }
        $canonicalQueryStr = implode('&', $canonicalQuery);

        $canonicalHeaders = 'host:' . $host . "\n";
        $signedHeadersList = 'host';
        if (isset($signedHeaders['Content-Type'])) {
            $canonicalHeaders .= 'content-type:' . $signedHeaders['Content-Type'] . "\n";
            $signedHeadersList = 'content-type;host';
            // Rebuild signed headers order: content-type;host
            $query['X-Amz-SignedHeaders'] = $signedHeadersList;
            ksort($query);
            $canonicalQuery = [];
            foreach ($query as $k => $v) {
                $canonicalQuery[] = rawurlencode($k) . '=' . rawurlencode($v);
            }
            $canonicalQueryStr = implode('&', $canonicalQuery);
        }

        $payloadHash = 'UNSIGNED-PAYLOAD';
        $canonicalRequest = implode("\n", [
            $method,
            $canonicalUri,
            $canonicalQueryStr,
            $canonicalHeaders,
            $signedHeadersList,
            $payloadHash,
        ]);
        $stringToSign = implode("\n", [
            'AWS4-HMAC-SHA256',
            $amzDate,
            $credentialScope,
            hash('sha256', $canonicalRequest),
        ]);
        $signingKey = self::signingKey($secret, $dateStamp, $region, $service);
        $signature = hash_hmac('sha256', $stringToSign, $signingKey);
        return $endpoint . $canonicalUri . '?' . $canonicalQueryStr . '&X-Amz-Signature=' . $signature;
    }

    private static function signedRequestUrl(string $method, string $objectKey): string
    {
        // For HEAD/DELETE use Authorization header style via curl would be better;
        // simplify with short-lived query presign.
        return self::presign($method, $objectKey, 300, []);
    }

    private static function encodeKey(string $key): string
    {
        $parts = explode('/', $key);
        return implode('/', array_map('rawurlencode', $parts));
    }

    private static function signingKey(string $secret, string $date, string $region, string $service): string
    {
        $kDate = hash_hmac('sha256', $date, 'AWS4' . $secret, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);
        return hash_hmac('sha256', 'aws4_request', $kService, true);
    }
}

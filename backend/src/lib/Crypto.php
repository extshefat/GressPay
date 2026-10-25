<?php
declare(strict_types=1);

/** Encrypt provider secrets at rest (AES-256-GCM). Never log plaintext. */
final class GpCrypto
{
    public static function seal(string $plaintext): string
    {
        $key = GpConfig::encryptionKey();
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($cipher === false) {
            throw new RuntimeException('Encryption failed.');
        }
        return 'v1:' . base64_encode($iv . $tag . $cipher);
    }

    public static function open(string $sealed): ?string
    {
        if (!str_starts_with($sealed, 'v1:')) {
            return null;
        }
        $raw = base64_decode(substr($sealed, 3), true);
        if ($raw === false || strlen($raw) < 28) {
            return null;
        }
        $iv = substr($raw, 0, 12);
        $tag = substr($raw, 12, 16);
        $cipher = substr($raw, 28);
        $plain = openssl_decrypt($cipher, 'aes-256-gcm', GpConfig::encryptionKey(), OPENSSL_RAW_DATA, $iv, $tag);
        return $plain === false ? null : $plain;
    }
}

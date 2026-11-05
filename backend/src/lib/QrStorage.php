<?php
declare(strict_types=1);

/** Validated raster QR storage outside the document root. Public URLs are opaque capabilities. */
final class GpQrStorage
{
    public static function validate(string $bytes): array
    {
        if ($bytes === '' || strlen($bytes) > min(3 * 1024 * 1024, GpConfig::r2MaxUploadBytes())) throw new InvalidArgumentException('QR image must be at most 3MB.');
        $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
        $image = @getimagesizefromstring($bytes);
        if (!in_array($mime, ['image/png','image/jpeg','image/webp'], true) || !$image || ($image['mime'] ?? '') !== $mime
            || $image[0] < 1 || $image[1] < 1 || $image[0] > 2048 || $image[1] > 2048 || $image[0] * $image[1] > 4000000
            || preg_match('/<\?(?:php|=)|<svg\b|<script\b|<html\b/i', $bytes)) throw new InvalidArgumentException('Invalid raster QR image or dimensions.');
        // Reject appended payloads rather than accepting a valid image prefix.
        if (($mime === 'image/png' && substr($bytes, -12) !== "\0\0\0\0IEND\xaeB`\x82")
            || ($mime === 'image/jpeg' && substr($bytes, -2) !== "\xff\xd9")
            || ($mime === 'image/webp' && (strlen($bytes) < 12 || unpack('Vsize', substr($bytes,4,4))['size'] + 8 !== strlen($bytes)))) throw new InvalidArgumentException('Invalid image envelope.');
        if (!function_exists('imagecreatefromstring')) throw new RuntimeException('QR uploads require the GD extension.');
        $decoded = @imagecreatefromstring($bytes);
        if ($decoded === false) throw new InvalidArgumentException('QR image decoding failed.');
        try {
            ob_start();
            imagealphablending($decoded, false); imagesavealpha($decoded, true);
            if (!imagepng($decoded, null, 6)) throw new InvalidArgumentException('QR image encoding failed.');
            $clean = (string) ob_get_contents();
        } finally { ob_end_clean(); imagedestroy($decoded); }
        return ['bytes' => $clean, 'mime' => 'image/png', 'checksum' => hash('sha256',$clean)];
    }

    public static function fromDataUrl(string $url): array
    {
        if (strlen($url) > 4 * 1024 * 1024 + 128 || !preg_match('#^data:image/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$#D', $url, $matches)) throw new InvalidArgumentException('Invalid QR data URL.');
        $bytes = base64_decode($matches[1], true);
        if ($bytes === false) throw new InvalidArgumentException('Invalid QR encoding.');
        return self::validate($bytes);
    }

    public static function put(array $image): string
    {
        $dir = GRESSPAY_ROOT . '/storage/qr';
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new RuntimeException('QR storage unavailable.');
        $key = 'local-qr/' . bin2hex(random_bytes(24)) . '.png';
        $path = $dir . '/' . basename($key);
        if (file_put_contents($path, $image['bytes'], LOCK_EX) !== strlen($image['bytes'])) throw new RuntimeException('QR storage write failed.');
        chmod($path, 0600);
        return $key;
    }

    public static function delete(string $key): void
    {
        if (!preg_match('#^local-qr/[a-f0-9]{48}\.png$#D', $key)) return;
        if (GpDb::one('SELECT id FROM gp_gateways WHERE qr_object_key = ?', [$key]) !== null) return;
        $path=GRESSPAY_ROOT . '/storage/qr/' . basename($key);
        if (is_file($path) && !unlink($path)) error_log('Unreferenced QR file cleanup failed.');
    }

    public static function url(string $key): string
    {
        return GpPlatform::publicSiteRoot() . '/api/v1/assets/qr/' . basename($key);
    }

    public static function serve(string $filename): never
    {
        if (!preg_match('/^[a-f0-9]{48}\.png$/D', $filename)) GpJson::error('NOT_FOUND','QR not found.',404);
        // Revocation/deletion must also revoke the public capability.
        $row = GpDb::one('SELECT id FROM gp_gateways WHERE qr_object_key = ? AND qr_status = ?', ['local-qr/'.$filename,'ready']);
        $path = GRESSPAY_ROOT . '/storage/qr/' . $filename;
        if (!$row || !is_file($path)) GpJson::error('NOT_FOUND','QR not found.',404);
        header('Content-Type: image/png'); header('X-Content-Type-Options: nosniff');
        header('Content-Length: ' . filesize($path)); header('Cache-Control: no-store');
        readfile($path); exit;
    }

    public static function migrateLegacy(): void
    {
        foreach (GpDb::all("SELECT id, qr_object_key FROM gp_gateways WHERE qr_object_key LIKE 'data:%' AND qr_status <> 'failed'") as $row) {
            try {
                $image = self::fromDataUrl($row['qr_object_key']); $key = self::put($image);
                GpDb::exec('UPDATE gp_gateways SET qr_object_key = ?, qr_mime = ?, qr_bytes = ?, qr_checksum = ?, qr_status = ? WHERE id = ? AND qr_object_key = ?', [$key,$image['mime'],strlen($image['bytes']),$image['checksum'],'ready',$row['id'],$row['qr_object_key']]);
            } catch (InvalidArgumentException $e) {
                // Preserve invalid legacy bytes for owner remediation, but never serve them.
                GpDb::exec('UPDATE gp_gateways SET qr_status = ? WHERE id = ?', ['failed',$row['id']]);
            }
        }
    }
}

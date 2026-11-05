<?php
declare(strict_types=1);

/**
 * Minimal mailer: SMTP when configured, otherwise log driver (development).
 */
final class GpMailer
{
    public static function send(string $to, string $subject, string $textBody, string $htmlBody = ''): bool
    {
        $to = trim($to);
        if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        $driver = strtolower(GpConfig::get('MAIL_DRIVER', ''));
        if ($driver === '') {
            $driver = GpConfig::get('APP_ENV', 'production') === 'development' ? 'log' : 'smtp';
        }
        if ($driver === 'log' || $driver === 'null') {
            error_log(sprintf('[GpMailer:%s] to=%s subject=%s body=%s', $driver, $to, $subject, $textBody));
            return true;
        }

        $host = trim(GpConfig::get('SMTP_HOST', ''));
        $port = (int) GpConfig::get('SMTP_PORT', '587');
        $user = GpConfig::get('SMTP_USER', '');
        $pass = GpConfig::get('SMTP_PASS', '');
        $from = trim(GpConfig::get('SMTP_FROM', $user));
        if ($host === '' || $from === '') {
            error_log('[GpMailer] SMTP not configured; logging mail instead');
            error_log(sprintf('[GpMailer:fallback] to=%s subject=%s body=%s', $to, $subject, $textBody));
            return true;
        }

        $errno = 0;
        $errstr = '';
        $remote = ($port === 465 ? 'ssl://' : '') . $host . ':' . $port;
        $fp = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
        if (!$fp) {
            error_log("[GpMailer] connect failed: {$errstr} ({$errno})");
            return false;
        }
        stream_set_timeout($fp, 15);
        try {
            self::expect($fp, 220);
            self::cmd($fp, 'EHLO gresspay.local', 250);
            if ($port !== 465) {
                self::cmd($fp, 'STARTTLS', 220);
                if (!stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('STARTTLS failed');
                }
                self::cmd($fp, 'EHLO gresspay.local', 250);
            }
            if ($user !== '') {
                self::cmd($fp, 'AUTH LOGIN', 334);
                self::cmd($fp, base64_encode($user), 334);
                self::cmd($fp, base64_encode($pass), 235);
            }
            self::cmd($fp, 'MAIL FROM:<' . $from . '>', 250);
            self::cmd($fp, 'RCPT TO:<' . $to . '>', 250);
            self::cmd($fp, 'DATA', 354);
            $headers = [
                'From: ' . $from,
                'To: ' . $to,
                'Subject: ' . self::encodeHeader($subject),
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: 8bit',
            ];
            $data = implode("\r\n", $headers) . "\r\n\r\n" . str_replace("\n.", "\n..", $textBody) . "\r\n.";
            fwrite($fp, $data . "\r\n");
            self::expect($fp, 250);
            self::cmd($fp, 'QUIT', 221);
            fclose($fp);
            return true;
        } catch (Throwable $e) {
            error_log('[GpMailer] send failed: ' . $e->getMessage());
            fclose($fp);
            return false;
        }
    }

    public static function sendVerifyEmail(string $to, string $name, string $verifyUrl): bool
    {
        $subject = 'Verify your GressPay email';
        $text = "Hi {$name},\n\nConfirm your email to unlock live API keys and admin tools:\n{$verifyUrl}\n\nThis link expires in 24 hours.\n";
        return self::send($to, $subject, $text);
    }

    private static function encodeHeader(string $s): string
    {
        if (preg_match('/^[\x20-\x7E]+$/', $s)) {
            return $s;
        }
        return '=?UTF-8?B?' . base64_encode($s) . '?=';
    }

    /** @param resource $fp */
    private static function cmd($fp, string $line, int $expect): void
    {
        fwrite($fp, $line . "\r\n");
        self::expect($fp, $expect);
    }

    /** @param resource $fp */
    private static function expect($fp, int $code): void
    {
        $resp = '';
        while (($line = fgets($fp, 512)) !== false) {
            $resp .= $line;
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ((int) substr($resp, 0, 3) !== $code) {
            throw new RuntimeException('SMTP unexpected: ' . trim($resp));
        }
    }
}

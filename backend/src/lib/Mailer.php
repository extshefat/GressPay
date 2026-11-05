<?php
declare(strict_types=1);

/** Minimal SMTP adapter; no credentials or SMTP responses are logged. */
final class GpMailer
{
    public static function verification(string $recipient, string $link): void
    {
        $host = GpConfig::get('SMTP_HOST');
        if ($host === '' && GpConfig::isDevelopment()) {
            error_log('[Development email verification] ' . $link);
            return;
        }
        $from = GpConfig::get('SMTP_FROM');
        if ($host === '' || !filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($recipient, FILTER_VALIDATE_EMAIL)) throw new RuntimeException('Verification mail is unavailable.');
        $mode = GpConfig::get('SMTP_ENCRYPTION', 'tls');
        if (!in_array($mode, ['tls', 'ssl'], true) || !preg_match('/^[a-zA-Z0-9.-]+$/D', $host)) throw new RuntimeException('Invalid SMTP configuration.');
        $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host]]);
        $socket = @stream_socket_client(($mode === 'ssl' ? 'ssl' : 'tcp') . '://' . $host . ':' . (int) GpConfig::get('SMTP_PORT', $mode === 'ssl' ? '465' : '587'), $errno, $error, 10, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) throw new RuntimeException('Verification mail is unavailable.');
        stream_set_timeout($socket, 10);
        $reply = static function (array $expected) use ($socket): void {
            $line = ''; $lines = 0;
            do {
                $line = fgets($socket, 2048);
                if ($line === false || ++$lines > 100) throw new RuntimeException('SMTP delivery failed.');
            } while (isset($line[3]) && $line[3] === '-');
            if (!in_array((int) substr($line, 0, 3), $expected, true)) throw new RuntimeException('SMTP delivery failed.');
        };
        $command = static function (string $line, array $expected) use ($socket, $reply): void {
            if (str_contains($line, "\r") || str_contains($line, "\n")) throw new RuntimeException('Invalid SMTP command.');
            fwrite($socket, $line . "\r\n"); $reply($expected);
        };
        try {
            $reply([220]); $command('EHLO gresspay', [250]);
            if ($mode === 'tls') {
                $command('STARTTLS', [220]);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) throw new RuntimeException('SMTP TLS failed.');
                $command('EHLO gresspay', [250]);
            }
            if (GpConfig::get('SMTP_USERNAME') !== '') {
                $command('AUTH LOGIN', [334]);
                $command(base64_encode(GpConfig::get('SMTP_USERNAME')), [334]);
                $command(base64_encode(GpConfig::get('SMTP_PASSWORD')), [235]);
            }
            $command('MAIL FROM:<' . $from . '>', [250]);
            $command('RCPT TO:<' . $recipient . '>', [250,251]);
            $command('DATA', [354]);
            $body = "From: GressPay <{$from}>\r\nTo: <{$recipient}>\r\nSubject: Verify your GressPay email\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\nVerify your email within 24 hours:\r\n{$link}\r\n\r\nIf you did not create this account, do not open the link.\r\n.\r\n";
            fwrite($socket, $body); $reply([250]); $command('QUIT', [221]);
        } finally { fclose($socket); }
    }
}

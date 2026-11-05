<?php
declare(strict_types=1);

final class GpMerchantSecrets
{
    private const FIELDS = ['telegram_bot_token', 'discord_webhook_url'];

    public static function seal(string $field, string $value): ?string
    {
        if (!in_array($field, self::FIELDS, true)) throw new InvalidArgumentException('Unknown secret field.');
        return $value === '' ? null : GpCrypto::seal($value, 'gresspay/merchant/' . $field);
    }

    public static function read(array $merchant, string $field): string
    {
        if (!in_array($field, self::FIELDS, true)) throw new InvalidArgumentException('Unknown secret field.');
        $stored = (string) ($merchant[$field] ?? '');
        if ($stored === '') return '';
        if (str_starts_with($stored, 'v1:')) {
            $value = GpCrypto::open($stored, 'gresspay/merchant/' . $field);
            if ($value === null) throw new RuntimeException('Alert credential could not be opened.');
            return $value;
        }
        GpDb::exec('UPDATE gp_merchants SET ' . $field . ' = ? WHERE merchant_id = ? AND ' . $field . ' = ?', [self::seal($field, $stored), $merchant['merchant_id'], $stored]);
        return $stored;
    }
}

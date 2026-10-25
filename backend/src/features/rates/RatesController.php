<?php
declare(strict_types=1);

final class RatesController
{
    public static function handle(GpRequest $req): never
    {
        if ($req->method !== 'GET') {
            GpJson::error('METHOD_NOT_ALLOWED', 'GET only.', 405);
        }
        $actor = GpAuth::optionalActor($req);
        $brandId = $actor['brand_id'] ?? null;
        $payload = GpRatesEngine::publicPayload($brandId);
        $from = strtoupper((string) ($req->input('from', '')));
        $to = strtoupper((string) ($req->input('to', '')));
        $amount = GpMoney::sanitize((string) $req->input('amount', '1'));
        if ($from !== '' && $to !== '' && $brandId) {
            $payload['conversion'] = [
                'from' => $from,
                'to' => $to,
                'amount' => (float) GpMoney::round($amount),
                'result' => (float) GpRatesEngine::convert($brandId, $amount, $from, $to),
            ];
        }
        GpJson::send($payload);
    }
}

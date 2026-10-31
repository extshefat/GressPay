<?php
declare(strict_types=1);

class BinancePersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Binance Pay',
            'logo' => '/methods/binance_pay.png',
            'currency' => 'USDT',
            'tab' => 'crypto',
            'gateway_type' => 'provider',
            'sender_key' => 'binance_pay',
            'sender_type' => 'Merchant API',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#F0B90B',
            'text_color' => '#0B0E11',
            'btn_color' => '#F0B90B',
            'btn_text_color' => '#0B0E11',
        ];
    }

    public function accountLabel(): string
    {
        return 'Binance Pay ID / UID';
    }

    public function sendVerb(): string
    {
        return 'Pay';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9\-]{8,40}$/';
    }

    public function trxHint(): string
    {
        return 'Use hosted Binance Pay checkout — do not paste order IDs for live completion.';
    }

    public function fields(): array
    {
        return [
            ['name' => 'account', 'label' => $this->accountLabel(), 'type' => 'text'],
        ];
    }
}

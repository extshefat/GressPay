<?php
declare(strict_types=1);

class BybitPayGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Bybit Pay',
            'logo' => '/methods/bybit_pay.svg',
            'currency' => 'USDT',
            'tab' => 'crypto',
            'gateway_type' => 'manual',
            'sender_key' => 'bybit_pay',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#F7A600',
            'text_color' => '#0B0E11',
            'btn_color' => '#F7A600',
            'btn_text_color' => '#0B0E11',
        ];
    }

    public function accountLabel(): string
    {
        return 'Bybit UID';
    }

    public function sendVerb(): string
    {
        return 'Pay';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9\-]{6,40}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Bybit Pay / internal transfer ID.';
    }

    public function fields(): array
    {
        return [
            ['name' => 'account', 'label' => $this->accountLabel(), 'type' => 'text'],
        ];
    }
}

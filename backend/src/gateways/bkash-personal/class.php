<?php
declare(strict_types=1);

class BkashPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'bKash',
            'logo' => '/methods/bkash.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'bkash',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#E2136E',
            'text_color' => '#FFFFFF',
            'btn_color' => '#E2136E',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'bKash personal number';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,12}$/';
    }

    public function trxHint(): string
    {
        return 'bKash TxID is usually 10 characters from the confirmation SMS.';
    }
}

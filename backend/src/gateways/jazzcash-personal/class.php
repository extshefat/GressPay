<?php
declare(strict_types=1);

class JazzcashPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'JazzCash',
            'logo' => '/methods/jazzcash.svg',
            'currency' => 'PKR',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'jazzcash',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#D71920',
            'text_color' => '#FFFFFF',
            'btn_color' => '#D71920',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'JazzCash mobile account';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,20}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the JazzCash TID from the 8558 SMS.';
    }
}

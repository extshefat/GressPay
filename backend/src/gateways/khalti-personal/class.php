<?php
declare(strict_types=1);

class KhaltiPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Khalti',
            'logo' => '/methods/khalti.svg',
            'currency' => 'NPR',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'khalti',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#5C2D91',
            'text_color' => '#FFFFFF',
            'btn_color' => '#5C2D91',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Khalti ID';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9\-]{6,24}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Khalti transaction reference.';
    }
}

<?php
declare(strict_types=1);

class UpayPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Upay',
            'logo' => '/methods/upay.png',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'upay',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#E31E24',
            'text_color' => '#FFFFFF',
            'btn_color' => '#E31E24',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Upay personal number';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,16}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Upay transaction ID from the SMS.';
    }
}

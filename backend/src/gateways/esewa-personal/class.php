<?php
declare(strict_types=1);

class EsewaPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'eSewa',
            'logo' => '/methods/esewa.svg',
            'currency' => 'NPR',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'esewa',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#60BB46',
            'text_color' => '#0B1220',
            'btn_color' => '#60BB46',
            'btn_text_color' => '#0B1220',
        ];
    }

    public function accountLabel(): string
    {
        return 'eSewa ID';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9\-]{6,24}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the eSewa reference code.';
    }
}

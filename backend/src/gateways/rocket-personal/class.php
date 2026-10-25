<?php
declare(strict_types=1);

class RocketPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Rocket',
            'logo' => '/methods/rocket.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'rocket',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#8C3494',
            'text_color' => '#FFFFFF',
            'btn_color' => '#8C3494',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Rocket account (with 12th digit)';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,16}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Rocket TxnId from the confirmation SMS.';
    }
}

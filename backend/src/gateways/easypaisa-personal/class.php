<?php
declare(strict_types=1);

class EasypaisaPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Easypaisa',
            'logo' => '/methods/easypaisa.svg',
            'currency' => 'PKR',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'easypaisa',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#00A651',
            'text_color' => '#FFFFFF',
            'btn_color' => '#00A651',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Easypaisa mobile account';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,20}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Easypaisa TID from the 3737 SMS.';
    }
}

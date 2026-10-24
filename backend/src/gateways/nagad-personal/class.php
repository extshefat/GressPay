<?php
declare(strict_types=1);

class NagadPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Nagad',
            'logo' => '/methods/nagad.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'nagad',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#F6921E',
            'text_color' => '#FFFFFF',
            'btn_color' => '#F6921E',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Nagad personal number';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,12}$/';
    }

    public function trxHint(): string
    {
        return 'Nagad TrxID is usually 8 characters from the confirmation SMS.';
    }
}

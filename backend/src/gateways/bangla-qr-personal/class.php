<?php
declare(strict_types=1);

class BanglaQrPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Bangla QR',
            'logo' => '/methods/bangla_qr.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'bangla_qr',
            'sender_type' => 'Personal',
        ];
    }
}

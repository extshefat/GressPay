<?php
declare(strict_types=1);

class BanglaQrV2PersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Bangla QR V2',
            'logo' => '/methods/bangla_qr_v2.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'bangla_qr_v2',
            'sender_type' => 'Personal',
        ];
    }
}

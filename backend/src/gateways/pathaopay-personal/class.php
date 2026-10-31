<?php
declare(strict_types=1);

class PathaopayPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Pathao Pay',
            'logo' => '/methods/bkash.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'pathaopay',
            'sender_type' => 'Personal',
        ];
    }
}

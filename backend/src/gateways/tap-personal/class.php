<?php
declare(strict_types=1);

class TapPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Tap',
            'logo' => '/methods/tap.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'tap',
            'sender_type' => 'Personal',
        ];
    }
}

<?php
declare(strict_types=1);

class McashPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'mCash',
            'logo' => '/methods/bkash.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'mcash',
            'sender_type' => 'Personal',
        ];
    }
}

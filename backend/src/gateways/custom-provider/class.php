<?php
declare(strict_types=1);

class CustomProviderGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Custom provider',
            'logo' => '/methods/bkash.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'custom_provider',
            'sender_type' => 'Personal',
        ];
    }
}

<?php
declare(strict_types=1);

class AamarPayPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'aamarPay',
            'logo' => '/methods/aamar_pay.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'aamar_pay',
            'sender_type' => 'Personal',
        ];
    }
}

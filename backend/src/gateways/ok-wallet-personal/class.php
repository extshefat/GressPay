<?php
declare(strict_types=1);

class OkWalletPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'OK Wallet',
            'logo' => '/methods/ok_wallet.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'manual',
            'sender_key' => 'ok_wallet',
            'sender_type' => 'Personal',
        ];
    }
}

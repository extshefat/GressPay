<?php
declare(strict_types=1);

class UsdtTrc20Gateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'USDT TRC-20',
            'logo' => '/methods/usdt_trc20.svg',
            'currency' => 'USDT',
            'tab' => 'crypto',
            'gateway_type' => 'onchain',
            'sender_key' => 'usdt_trc20',
            'sender_type' => 'On-chain',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#26A17B',
            'text_color' => '#FFFFFF',
            'btn_color' => '#26A17B',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'TRON USDT address';
    }

    public function sendVerb(): string
    {
        return 'Send';
    }

    public function trxPattern(): string
    {
        return '/^[A-Fa-f0-9]{64}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the 64-character TRON transaction hash.';
    }

    public function caseFoldTrx(): bool
    {
        return false;
    }
}

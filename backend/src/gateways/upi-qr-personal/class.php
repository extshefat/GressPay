<?php
declare(strict_types=1);

class UpiQrPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'UPI QR',
            'logo' => '/methods/upi_qr.svg',
            'currency' => 'INR',
            'tab' => 'bank_upi',
            'gateway_type' => 'automation',
            'sender_key' => 'upi_qr',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#097939',
            'text_color' => '#FFFFFF',
            'btn_color' => '#097939',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'UPI ID (VPA)';
    }

    public function sendVerb(): string
    {
        return 'Pay';
    }

    public function trxPattern(): string
    {
        return '/^[0-9]{12}$/';
    }

    public function trxHint(): string
    {
        return 'UPI UTR is 12 digits from the payer app.';
    }
}

<?php
declare(strict_types=1);

class PhonepeIntentGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'PhonePe',
            'logo' => '/methods/phonepe.svg',
            'currency' => 'INR',
            'tab' => 'bank_upi',
            'gateway_type' => 'automation',
            'sender_key' => 'phonepe',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#5F259F',
            'text_color' => '#FFFFFF',
            'btn_color' => '#5F259F',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'PhonePe / UPI VPA';
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
        return 'PhonePe UTR is 12 digits.';
    }
}

<?php
declare(strict_types=1);

class CellfinPersonalGateway extends GressPayBaseGateway
{
    public function info(): array
    {
        return [
            'title' => 'Cellfin',
            'logo' => '/methods/cellfin.svg',
            'currency' => 'BDT',
            'tab' => 'mfs',
            'gateway_type' => 'automation',
            'sender_key' => 'cellfin',
            'sender_type' => 'Personal',
        ];
    }

    public function color(): array
    {
        return [
            'primary_color' => '#0B6E4F',
            'text_color' => '#FFFFFF',
            'btn_color' => '#0B6E4F',
            'btn_text_color' => '#FFFFFF',
        ];
    }

    public function accountLabel(): string
    {
        return 'Cellfin account number';
    }

    public function sendVerb(): string
    {
        return 'Fund Transfer';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{8,20}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the Cellfin reference from the confirmation SMS.';
    }
}

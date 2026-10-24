<?php
declare(strict_types=1);

interface GatewayInterface
{
    public function info(): array;

    public function color(): array;

    public function fields(): array;

    public function instructions(array $data): array;

    public function processPayment(array $data): array;

    public function ipn(array $data);

    public function verifyTx(array $data): array;

    public function trxHint(): string;

    public function accountLabel(): string;

    public function normalizeTrx(string $trxId): string;
}

abstract class GressPayBaseGateway implements GatewayInterface
{
    public function color(): array
    {
        return [
            'primary_color' => '#22D3EE',
            'text_color' => '#0B1220',
            'btn_color' => '#22D3EE',
            'btn_text_color' => '#0B1220',
        ];
    }

    public function theme(): array
    {
        $c = $this->color();
        return [
            'primary' => $c['primary_color'] ?? '#22D3EE',
            'text' => $c['text_color'] ?? '#FFFFFF',
            'button' => $c['btn_color'] ?? ($c['primary_color'] ?? '#22D3EE'),
            'buttonText' => $c['btn_text_color'] ?? '#0B1220',
        ];
    }

    public function accountLabel(): string
    {
        return 'Send Money number';
    }

    public function sendVerb(): string
    {
        return 'Send Money';
    }

    public function trxPattern(): string
    {
        return '/^[A-Za-z0-9]{6,64}$/';
    }

    public function trxHint(): string
    {
        return 'Paste the transaction ID from the wallet SMS or app.';
    }

    public function caseFoldTrx(): bool
    {
        return true;
    }

    public function normalizeTrx(string $trxId): string
    {
        $trxId = trim($trxId);
        return $this->caseFoldTrx() ? strtoupper($trxId) : $trxId;
    }

    public function fields(): array
    {
        return [
            ['name' => 'account', 'label' => $this->accountLabel(), 'type' => 'text'],
        ];
    }

    public function instructions(array $data): array
    {
        $account = trim((string) ($data['options']['account'] ?? $data['options']['depositAddressOrNumber'] ?? ''));
        $amount = (string) ($data['transaction']['amount'] ?? '');
        $currency = (string) ($data['transaction']['currency'] ?? '');
        $title = (string) ($this->info()['title'] ?? 'wallet');
        $payLine = trim($amount . ' ' . $currency);
        $accountLine = $account !== '' ? $account : 'the number saved in Methods';

        return [
            ['text' => 'Open the ' . $title . ' app.', 'copy' => false],
            [
                'text' => $this->sendVerb() . ($payLine !== '' ? ' exactly ' . $payLine : '') . ' to ' . $accountLine . '.',
                'copy' => $account !== '',
                'value' => $account,
            ],
            ['text' => $this->trxHint(), 'copy' => false],
        ];
    }

    public function processPayment(array $data): array
    {
        return [
            'ok' => false,
            'message' => 'This rail is TxID confirmation, not a live provider charge API.',
        ];
    }

    public function ipn(array $data)
    {
        return null;
    }

    public function verifyTx(array $data): array
    {
        $trx = $this->normalizeTrx((string) ($data['trx_id'] ?? ''));
        if ($trx === '' || preg_match($this->trxPattern(), $trx) !== 1) {
            return [
                'ok' => false,
                'status' => 'invalid',
                'message' => $this->trxHint(),
            ];
        }
        return [
            'ok' => true,
            'status' => 'valid',
            'trx_id' => $trx,
            'message' => 'TxID format accepted.',
        ];
    }
}

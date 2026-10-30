# GressPay Companion (Android)

Merchant SMS companion for **GressPay** Bangladesh rails (bKash / Nagad / Rocket / Upay / Cellfin).  
Open this folder in **Android Studio**. Package: `com.gresspay.companion`.

## What it does

1. Register via `POST /api/v1/companion/register` (merchant `gp_live_` / `gp_test_` key).
2. After **explicit opt-in** + `RECEIVE_SMS` (+ notifications on Android 13+), listen for payment SMS.
3. Parse only amount + TxID + rail; reject OTP / promo noise.
4. Upload via WorkManager with idempotency keys — never full message bodies. Sends `X-GressPay-Brand` (returned at register) with the device token.
5. Optional **Scan Inbox (24h)** backfill requests `READ_SMS` at runtime when used.
6. Server matches pending checkouts; revoked devices cannot upload.

## Permissions

| Permission | When |
|---|---|
| `RECEIVE_SMS` | Required to enable live matching |
| `POST_NOTIFICATIONS` | Android 13+ for the dataSync foreground service |
| `READ_SMS` | Requested only when the merchant taps **Scan & Sync Recent Inbox SMS** |

## Security

- EncryptedSharedPreferences (Android Keystore) for tokens
- HTTPS required (http only for `localhost` / `10.0.2.2`)
- Do not log credentials or SMS contents
- Foreground service type: `dataSync` (Android 12–15)

## Run

1. Android Studio → Open `GressPay-App-Project/`
2. JDK 17+, API 26+
3. API base e.g. `https://gresspay.extxcheats.com` or emulator `http://10.0.2.2:8080`
4. Register device → consent → enable matching → optional inbox scan

Public download (after assemble): `/download/gresspay-companion.apk` (version `1.1.1`).

## Tests / build

```bash
./gradlew test --tests com.gresspay.companion.sms.PaymentSmsParserTest
./gradlew assembleDebug
cp app/build/outputs/apk/release/app-release.apk ../public/download/gresspay-companion.apk
```

## Related

`backend/docs/PHASE1_RAILS.md`

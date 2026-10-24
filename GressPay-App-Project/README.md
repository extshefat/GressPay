# GressPay Companion (Android)

Merchant SMS companion for **GressPay** Bangladesh rails (bKash / Nagad).  
Open this folder in **Android Studio**. Package: `com.gresspay.companion`.

## What it does

1. Register via `POST /api/v1/companion/register` (merchant `gp_live_` / `gp_test_` key).
2. After **explicit opt-in** + `RECEIVE_SMS`, listen for payment SMS.
3. Parse only amount + TxID + rail for bKash/Nagad; ignore ambiguous/unrelated SMS.
4. Upload via WorkManager with idempotency keys — never full message bodies.
5. Server matches pending checkouts; revoked devices cannot upload.

## Security

- EncryptedSharedPreferences (Android Keystore) for tokens
- No `READ_SMS` / inbox / default SMS app
- HTTPS required (http only for `localhost` / `10.0.2.2`)
- Do not log credentials or SMS contents

## Run

1. Android Studio → Open `GressPay-App/`
2. JDK 17, API 26+
3. API base e.g. `https://your-domain.com` or emulator `http://10.0.2.2:8080`
4. Register device → consent → enable matching

## Tests / build

Gradle wrapper is included (`gradlew` / `gradlew.bat`). Requires JDK 17 + Android SDK.

```bash
gradlew.bat test --tests com.gresspay.companion.sms.PaymentSmsParserTest
gradlew.bat assembleDebug
```

## Related

`GressPay- Web/backend/docs/PHASE1_RAILS.md`

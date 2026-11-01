# GressPay Companion — release APK

## Debug / CI (no keystore required)

`assembleDebug` and unit tests configure and build **without** `GRESSPAY_RELEASE_KEYSTORE`. Debug APKs use `applicationIdSuffix = .debug` and must **not** be published as `public/download/gresspay-companion.apk`.

```bash
cd GressPay-App-Project
./gradlew :app:testDebugUnitTest --tests com.gresspay.companion.sms.PaymentSmsParserTest
./gradlew :app:assembleDebug
```

## Release build (requires keystore)

Release packaging tasks (`assembleRelease`, `bundleRelease`, …) **fail at task execution** if `GRESSPAY_RELEASE_KEYSTORE` is missing. Project configuration no longer throws, so debug/CI stays usable.

```bash
export GRESSPAY_RELEASE_KEYSTORE=/secure/path/gresspay-companion-release.jks
export GRESSPAY_RELEASE_STORE_PASSWORD='…'
export GRESSPAY_RELEASE_KEY_ALIAS=gresspay   # optional; default gresspay
export GRESSPAY_RELEASE_KEY_PASSWORD='…'

./gradlew :app:assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

```bash
cp app/build/outputs/apk/release/app-release.apk ../public/download/gresspay-companion.apk
# Then update src/lib/marketing/companion-download.ts (version, sizeBytes, sha256).
```

## Env vars

| Variable | Description |
|----------|-------------|
| `GRESSPAY_RELEASE_KEYSTORE` | Path to `.jks` / `.keystore` (**required** for release ship tasks) |
| `GRESSPAY_RELEASE_STORE_PASSWORD` | Keystore password |
| `GRESSPAY_RELEASE_KEY_ALIAS` | Key alias (default `gresspay`) |
| `GRESSPAY_RELEASE_KEY_PASSWORD` | Key password |

When the keystore is present, R8 minify and resource shrink are enabled for release.

```bash
keytool -genkeypair -v -keystore gresspay-companion-release.jks \
  -alias gresspay -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=GressPay Companion, O=EXT SHEFAT, C=BD"
```

Never commit the keystore or passwords.

## Android 15 foreground service

The companion uses a `dataSync` foreground service for heartbeat/notification presence. On Android 15+, that type can be time-limited (~6 hours). Primary SMS capture is the **manifest `SmsBroadcastReceiver`** plus WorkManager upload — matching continues after the FGS stops. OEM battery savers may still delay broadcasts; document that for merchants.

## Version

Current source: **1.2.2** (`versionCode` 6). Bump both for each published APK. The file under `public/download/` is only release-signed after you build with the keystore above; do not claim signing status without inspecting the binary.

# GressPay Android APK — release build

Published download: `public/download/gresspay.apk` (launcher name **GressPay**).  
`applicationId` stays `com.gresspay.companion` so existing installs can update.

## Debug / CI (no keystore required)

`assembleDebug` and unit tests configure and build **without** `GRESSPAY_RELEASE_KEYSTORE`. Debug APKs use `applicationIdSuffix = .debug` and must **not** be published as `public/download/gresspay.apk`.

```bash
cd GressPay-App-Project
./gradlew :app:testDebugUnitTest
./gradlew :app:assembleDebug
# CI renames to gresspay-debug.apk and uploads the gresspay-debug artifact
```

## Release build (requires keystore)

Release packaging tasks (`assembleRelease`, `bundleRelease`, …) **fail at task execution** if `GRESSPAY_RELEASE_KEYSTORE` is missing. Project configuration no longer throws, so debug/CI stays usable.

```bash
export GRESSPAY_RELEASE_KEYSTORE=/secure/path/gresspay-release.jks
export GRESSPAY_RELEASE_STORE_PASSWORD='…'
export GRESSPAY_RELEASE_KEY_ALIAS=gresspay   # optional; default gresspay
export GRESSPAY_RELEASE_KEY_PASSWORD='…'

./gradlew :app:assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

```bash
cp app/build/outputs/apk/release/app-release.apk ../public/download/gresspay.apk
# Then update src/lib/marketing/companion-download.ts (version, sizeBytes, sha256, fileName).
```

## GitHub Actions secrets

| Secret | Description |
|--------|-------------|
| `GRESSPAY_RELEASE_KEYSTORE_BASE64` | Base64-encoded `.jks` / `.keystore` |
| `GRESSPAY_RELEASE_STORE_PASSWORD` | Keystore password |
| `GRESSPAY_RELEASE_KEY_ALIAS` | Key alias (default `gresspay`) |
| `GRESSPAY_RELEASE_KEY_PASSWORD` | Key password |

When set, the `android` job in `.github/workflows/verify.yml` runs `assembleRelease` (R8 on), uploads `gresspay-release`, and copies into `public/download/gresspay.apk` in the runner workspace (commit the updated APK + marketing metadata separately if needed).

## Env vars (local)

| Variable | Description |
|----------|-------------|
| `GRESSPAY_RELEASE_KEYSTORE` | Path to `.jks` / `.keystore` (**required** for release ship tasks) |
| `GRESSPAY_RELEASE_STORE_PASSWORD` | Keystore password |
| `GRESSPAY_RELEASE_KEY_ALIAS` | Key alias (default `gresspay`) |
| `GRESSPAY_RELEASE_KEY_PASSWORD` | Key password |

When the keystore is present, R8 minify and resource shrink are enabled for release.

```bash
keytool -genkeypair -v -keystore gresspay-release.jks \
  -alias gresspay -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=GressPay, O=EXT SHEFAT, C=BD"
```

Never commit the keystore or passwords.

## Android range

`minSdk 26` / `targetSdk 35` → Android **8.0–15**. Older than 8.0 is not supported (Compose + EncryptedSharedPreferences + modern SMS/FGS APIs).

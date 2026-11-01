# GressPay Companion — release APK

## Build (requires release keystore)

`assembleRelease` **fails** if `GRESSPAY_RELEASE_KEYSTORE` is not set. There is no silent debug-keystore fallback for release builds.

```bash
cd GressPay-App-Project

export GRESSPAY_RELEASE_KEYSTORE=/secure/path/gresspay-companion-release.jks
export GRESSPAY_RELEASE_STORE_PASSWORD='…'
export GRESSPAY_RELEASE_KEY_ALIAS=gresspay   # optional; default gresspay
export GRESSPAY_RELEASE_KEY_PASSWORD='…'

./gradlew :app:assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

Copy to the dashboard download path only after verifying the SHA-256 and package id (`com.gresspay.companion`, no `.debug` suffix):

```bash
cp app/build/outputs/apk/release/app-release.apk ../public/download/gresspay-companion.apk
# Then update src/lib/marketing/companion-download.ts (version, sizeBytes, sha256).
```

## Debug / CI builds

Use `assembleDebug` for local testing and CI artifacts. Debug APKs use `applicationIdSuffix = .debug` and must **not** be published as `public/download/gresspay-companion.apk`.

## Release signing env

| Variable | Description |
|----------|-------------|
| `GRESSPAY_RELEASE_KEYSTORE` | Path to `.jks` or `.keystore` file (**required** for release) |
| `GRESSPAY_RELEASE_STORE_PASSWORD` | Keystore password |
| `GRESSPAY_RELEASE_KEY_ALIAS` | Key alias (default `gresspay` if omitted) |
| `GRESSPAY_RELEASE_KEY_PASSWORD` | Key password |

Release builds enable R8 minify and resource shrink.

Generate a keystore once (store the file in your secrets manager, not in git):

```bash
keytool -genkeypair -v -keystore gresspay-companion-release.jks \
  -alias gresspay -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=GressPay Companion, O=EXT SHEFAT, C=BD"
```

## Sideload honesty

Installing from **unknown sources** (APK outside Google Play) will still trigger Android warnings and may show Play Protect prompts. A proper release signature and minified build reduce false positives but **do not guarantee zero warnings**. Install only from your official download URL on the Devices / Apps & Plugins pages.

## Version

Bump `versionCode` and `versionName` in `app/build.gradle.kts` for each published APK. Current source: **1.2.2** (`versionCode` 6).

The artifact already under `public/download/` may still be an older or debug-signed build until you re-publish with the steps above; do not replace it from CI debug jobs.

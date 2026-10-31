# GressPay Companion — release APK

## Build (local or CI)

```bash
cd GressPay-App-Project
./gradlew :app:assembleRelease
```

Output: `app/build/outputs/apk/release/app-release.apk`

Copy to the dashboard download path:

```bash
cp app/build/outputs/apk/release/app-release.apk ../public/download/gresspay-companion.apk
```

## Release signing (recommended for sideload)

Without a release keystore, Gradle signs the release APK with the **debug** keystore (fine for internal testing). For a stable release identity, set these environment variables before `assembleRelease`:

| Variable | Description |
|----------|-------------|
| `GRESSPAY_RELEASE_KEYSTORE` | Path to `.jks` or `.keystore` file |
| `GRESSPAY_RELEASE_STORE_PASSWORD` | Keystore password |
| `GRESSPAY_RELEASE_KEY_ALIAS` | Key alias (default `gresspay` if omitted) |
| `GRESSPAY_RELEASE_KEY_PASSWORD` | Key password |

When `GRESSPAY_RELEASE_KEYSTORE` is set, R8 **minify** and **resource shrink** are enabled automatically.

Generate a keystore once (store the file in your secrets manager, not in git):

```bash
keytool -genkeypair -v -keystore gresspay-companion-release.jks \
  -alias gresspay -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=GressPay Companion, O=EXT SHEFAT, C=BD"
```

## Sideload honesty

Installing from **unknown sources** (APK outside Google Play) will still trigger Android warnings and may show Play Protect prompts for apps that are not widely installed. A proper release signature and minified build reduce false positives but **do not guarantee zero warnings**. Install only from your official download URL on the Devices / Apps & Plugins pages.

## Version

Bump `versionCode` and `versionName` in `app/build.gradle.kts` for each published APK.

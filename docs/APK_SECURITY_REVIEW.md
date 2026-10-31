# GressPay Companion APK — security & Play Protect review

**Scope:** Static review of `public/download/gresspay-companion.apk` and the `GressPay-App-Project` source (October 2025). **No APK or manifest changes** in this document-only pass.

**Published artifact analyzed**

| Field | Value |
|-------|--------|
| Package | `com.gresspay.companion` |
| Version | `1.2.1` (`versionCode` 5) |
| `minSdk` / `targetSdk` | 26 / 35 |
| Size | ~11 MB (3 DEX files — Compose + Material stack) |

---

## Executive summary

Play Protect and sideload warnings for this app are **expected** given its role: a **non–Play Store financial companion** that declares **SMS read/receive**, runs an **exported high-priority SMS broadcast receiver**, and uploads parsed payment metadata to your API. The **currently hosted APK is signed with the public Android Debug certificate**, which strongly correlates with “unknown / suspicious” classifications when distributed outside a developer workstation.

There is **no evidence** in source of accessibility abuse, overlay fraud, package querying, dynamic code loading, or WebView JS bridges. Risk signals are dominated by **permission profile + sideload distribution + debug signing on a release-shaped build**.

---

## CI / build path (workflows)

From [`.github/workflows/verify.yml`](../.github/workflows/verify.yml):

1. Job **Android unit tests + APK** (`working-directory: GressPay-App-Project`)
2. `./gradlew :app:testDebugUnitTest --tests com.gresspay.companion.sms.PaymentSmsParserTest`
3. `./gradlew :app:assembleDebug`
4. Artifact upload: `GressPay-App-Project/app/build/outputs/apk/debug/*.apk` (name: `gresspay-companion-debug`)

**Important:** CI builds **debug** APKs (`applicationIdSuffix = .debug`). The file in `public/download/gresspay-companion.apk` is a **release package id** (`com.gresspay.companion`, no `.debug` suffix), consistent with local `assembleRelease` documented in [`GressPay-App-Project/RELEASE.md`](../GressPay-App-Project/RELEASE.md), then copied to `public/download/`.

README still documents copying **debug** output in one place; RELEASE.md documents **release** — align publishing runbooks in a follow-up.

---

## Signing configuration

| Topic | Finding |
|-------|---------|
| Gradle release signing | If `GRESSPAY_RELEASE_KEYSTORE` is set → release keystore + R8 minify/shrink. If unset → **release APK signed with debug keystore** ([`app/build.gradle.kts`](../GressPay-App-Project/app/build.gradle.kts)). |
| Published APK certificate | **`CN=Android Debug, O=Android, C=US`** (standard AOSP debug cert). Same cert as every default Android Studio debug build worldwide. |
| APK Signature Scheme v1 (JAR) | **Not present** |
| APK Signature Scheme v2 | **Present** |
| APK Signature Scheme v3 / v3.1 | **Not present** |
| R8 / ProGuard on published build | **Disabled** (minify only when release keystore env is set). [`proguard-rules.pro`](../GressPay-App-Project/app/proguard-rules.pro) is a stub. |

**Why this matters:** Play Protect treats sideloaded apps with debug signing and sensitive permissions as high-risk. Debug signing also prevents a stable publisher identity across updates.

---

## AndroidManifest permissions & components

Declared in [`AndroidManifest.xml`](../GressPay-App-Project/app/src/main/AndroidManifest.xml) (matches published APK via `aapt dump badging`):

| Permission / flag | Present | Notes |
|-------------------|---------|--------|
| `INTERNET` | Yes | API uploads |
| `ACCESS_NETWORK_STATE` | Yes | Connectivity |
| `RECEIVE_SMS` | Yes | Core product |
| `READ_SMS` | Yes | Inbox backfill ([`InboxScanner`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/sms/InboxScanner.kt)) |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` | Yes | [`SmsMatchService`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/sms/SmsMatchService.kt) |
| `POST_NOTIFICATIONS` | Yes | Runtime on Android 13+ |
| `RECEIVE_BOOT_COMPLETED` | Yes | Restart listeners after reboot |
| `QUERY_ALL_PACKAGES` | **No** | |
| `REQUEST_INSTALL_PACKAGES` | **No** | |
| Accessibility / overlay / admin | **No** | |
| `android:debuggable` | **No** (release build) | |
| `android:allowBackup` | **`false`** | Good — limits backup exfiltration |
| `usesCleartextTraffic` | **`false`** at app level | Loopback cleartext only via [`network_security_config.xml`](../GressPay-App-Project/app/src/main/res/xml/network_security_config.xml) |

**Exported components**

- `SmsBroadcastReceiver` — **`exported=true`**, `android:permission.BROADCAST_SMS`, intent priority **999** on `SMS_RECEIVED`. Required for real-time SMS, but is a **known sensitive pattern**.
- `BootCompletedReceiver` — `exported=true`
- `MainActivity` — launcher, exported

Runtime gating: SMS handling runs only when the user opts in (`matchingEnabled`, `consentAccepted`, valid device token) — see [`SmsBroadcastReceiver`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/sms/SmsBroadcastReceiver.kt). Play Protect does not inspect this logic; it sees static manifest + behavior classifiers.

---

## Network endpoints

All traffic via OkHttp in [`CompanionApi.kt`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/api/CompanionApi.kt):

- `{baseUrl}/api/v1/health`
- `{baseUrl}/api/v1/companion/register` (brand website API key)
- `{baseUrl}/api/v1/companion/heartbeat`
- `{baseUrl}/api/v1/companion/sms` (parsed fields only — no raw SMS body in JSON)

Base URL is user-configured; [`Prefs.isAllowedBaseUrl`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/data/Prefs.kt) requires HTTPS except loopback for dev.

---

## Obfuscation, dynamic loading, WebView, native code

| Area | Finding |
|------|---------|
| R8 minify | Off on current published APK |
| Dynamic DEX / `DexClassLoader` | **None** in Kotlin sources |
| WebView / `@JavascriptInterface` | **None** |
| Native `.so` | Only AndroidX Compose `libandroidx.graphics.path.so` (arm/x86 ABIs) — no custom NDK |

---

## Play Protect / false-positive patterns (SMS payment companions)

Google’s on-device scanning and cloud reputation commonly flag apps that:

1. **Read or intercept SMS** while also using **INTERNET** (classic SMS-forwarding / banking-trojan heuristic).
2. Are **installed outside Play** with **low global install count** and **non–Play signing identity**.
3. Use the **Android Debug certificate** on APKs end users install (indistinguishable from repackaged debug malware).
4. Declare **boot completed** + **SMS** + **foreground service** (persistence + exfiltration pattern).
5. Target current **`targetSdk`** with broad telephony access without Play’s declared use-case review (Play Store would require strong justification; sideload bypasses review but not Protect heuristics).

This app matches several categories **by design** (payment SMS matching). That does not mean it is malicious — it means **warnings are predictable** until signing, distribution, and permission surface improve.

---

## Ranked fix recommendations (implement later — not in this PR)

### P0 — Do before marketing the APK widely

1. **Sign release APKs with a dedicated release keystore** (`GRESSPAY_RELEASE_*` env in CI secrets). Never ship `CN=Android Debug` to customers.
2. **Enable v1 + v2 + v3 signing** in Gradle (`signingConfigs` / AGP defaults when using modern `apksigner`; add `v1SigningEnabled true` if legacy devices matter).
3. **Document a single publish path:** CI `assembleRelease` with secrets → copy to `public/download/`, or attach CI artifact after release signing — eliminate debug-vs-release doc drift.

### P1 — Reduce heuristic score

4. **Enable R8 minify + shrink** when release keystore is present (already wired in Gradle; ensure rules stay minimal).
5. **Consider lowering SMS receiver priority** from 999 unless required for latency; document why if kept.
6. **Play App Signing / internal testing track** (if Play distribution is ever an option): declare SMS permission use case, Data safety form, privacy policy URL.

### P2 — Trust & transparency

7. **Publish SHA-256 of release cert** on Dashboard / Apps page; users can compare before install.
8. **In-app disclosure** (already partially via consent flags): explicit SMS purpose + link to privacy policy.
9. **Optional:** restrict `SmsBroadcastReceiver` export model on newer APIs if platform allows with explicit delivery to your app only (evaluate per `targetSdk`).

### P3 — Operational

10. Submit sample APK + package name to [Google Play Protect appeal](https://support.google.com/googleplay/android-developer/answer/9888179) **after** release signing — debug-signed builds will be rejected or ignored.
11. Keep **`allowBackup=false`**; store secrets only in [`EncryptedSharedPreferences`](../GressPay-App-Project/app/src/main/java/com/gresspay/companion/data/Prefs.kt).

---

## References in repo

- Manifest: `GressPay-App-Project/app/src/main/AndroidManifest.xml`
- Gradle signing / minify: `GressPay-App-Project/app/build.gradle.kts`
- Release runbook: `GressPay-App-Project/RELEASE.md`
- CI: `.github/workflows/verify.yml`
- Download URL: `/download/gresspay-companion.apk` (from `public/download/`)

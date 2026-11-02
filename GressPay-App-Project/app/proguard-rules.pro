# GressPay release R8 rules (enabled when GRESSPAY_RELEASE_KEYSTORE is set).

-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# OkHttp / Okio
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# WorkManager
-keep class androidx.work.** { *; }

# Keep Prefs / pairing model fields used via reflection-free Kotlin
-keep class com.gresspay.companion.data.Prefs { *; }
-keep class com.gresspay.companion.data.RecentEvent { *; }

# Compose / Material are kept by default AGP rules; avoid stripping SMS entry points.
-keep class com.gresspay.companion.sms.** { *; }
-keep class com.gresspay.companion.api.** { *; }

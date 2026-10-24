package com.gresspay.companion.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Credentials stored via EncryptedSharedPreferences (Android Keystore-backed master key).
 * Never log deviceToken / apiKey.
 */
class Prefs(context: Context) {
    private val sp: SharedPreferences = createEncrypted(context)

    var baseUrl: String
        get() = sp.getString(KEY_BASE, "")?.trim()?.trimEnd('/') ?: ""
        set(value) = sp.edit().putString(KEY_BASE, value.trim().trimEnd('/')).apply()

    var apiKey: String
        get() = sp.getString(KEY_API, "") ?: ""
        set(value) = sp.edit().putString(KEY_API, value.trim()).apply()

    var deviceId: String
        get() = sp.getString(KEY_DEVICE_ID, "") ?: ""
        set(value) = sp.edit().putString(KEY_DEVICE_ID, value).apply()

    var deviceToken: String
        get() = sp.getString(KEY_DEVICE_TOKEN, "") ?: ""
        set(value) = sp.edit().putString(KEY_DEVICE_TOKEN, value.trim()).apply()

    /** Explicit merchant opt-in required before any SMS matching starts. */
    var matchingEnabled: Boolean
        get() = sp.getBoolean(KEY_MATCHING, false)
        set(value) = sp.edit().putBoolean(KEY_MATCHING, value).apply()

    var consentAccepted: Boolean
        get() = sp.getBoolean(KEY_CONSENT, false)
        set(value) = sp.edit().putBoolean(KEY_CONSENT, value).apply()

    var lastSyncAt: Long
        get() = sp.getLong(KEY_LAST_SYNC, 0L)
        set(value) = sp.edit().putLong(KEY_LAST_SYNC, value).apply()

    var lastError: String
        get() = sp.getString(KEY_LAST_ERROR, "") ?: ""
        set(value) = sp.edit().putString(KEY_LAST_ERROR, value.take(200)).apply()

    fun clearDevice() {
        sp.edit()
            .remove(KEY_DEVICE_ID)
            .remove(KEY_DEVICE_TOKEN)
            .putBoolean(KEY_MATCHING, false)
            .putBoolean(KEY_CONSENT, false)
            .remove(KEY_LAST_ERROR)
            .apply()
    }

    companion object {
        private const val KEY_BASE = "base_url"
        private const val KEY_API = "api_key"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_MATCHING = "matching_enabled"
        private const val KEY_CONSENT = "consent_accepted"
        private const val KEY_LAST_SYNC = "last_sync"
        private const val KEY_LAST_ERROR = "last_error"

        private fun createEncrypted(context: Context): SharedPreferences {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            return EncryptedSharedPreferences.create(
                context,
                "gresspay_companion_secure",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }

        /** Reject insecure non-loopback API bases in production builds. */
        fun isAllowedBaseUrl(url: String, allowCleartextLoopback: Boolean = true): Boolean {
            val u = url.trim().lowercase()
            if (u.isBlank()) return false
            if (u.startsWith("https://")) return true
            if (!allowCleartextLoopback) return false
            return u.startsWith("http://127.0.0.1") ||
                u.startsWith("http://localhost") ||
                u.startsWith("http://10.0.2.2") // Android emulator → host
        }
    }
}

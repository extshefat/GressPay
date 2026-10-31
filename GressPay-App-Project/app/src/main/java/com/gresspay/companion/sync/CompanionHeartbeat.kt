package com.gresspay.companion.sync

import android.content.Context
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs

/**
 * Updates server last_seen via POST /companion/heartbeat (device API key only).
 */
object CompanionHeartbeat {
    fun sendIfConfigured(context: Context): Boolean {
        val prefs = Prefs(context.applicationContext)
        val base = prefs.baseUrl
        val token = prefs.deviceToken
        if (base.isBlank() || token.isBlank()) return false
        if (!Prefs.isAllowedBaseUrl(base)) return false
        return try {
            val result = CompanionApi(base).postHeartbeat(token, prefs.brandId)
            if (result.ok) {
                if (result.brandId.isNotBlank()) {
                    prefs.brandId = result.brandId
                }
                if (result.apiBaseUrl.isNotBlank() && Prefs.isAllowedBaseUrl(result.apiBaseUrl)) {
                    prefs.baseUrl = result.apiBaseUrl
                }
                if (result.deviceId.isNotBlank()) {
                    prefs.deviceId = result.deviceId
                }
                prefs.lastSyncAt = System.currentTimeMillis()
                prefs.lastError = ""
            } else {
                prefs.lastError = result.message
            }
            result.ok
        } catch (e: Exception) {
            prefs.lastError = (e.message ?: "heartbeat_failed").take(200)
            false
        }
    }
}

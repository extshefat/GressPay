package com.gresspay.companion.sync

import android.content.Context
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs

/**
 * Updates server last_seen via POST /companion/heartbeat (brand-scoped device token).
 */
object CompanionHeartbeat {
    fun sendIfConfigured(context: Context): Boolean {
        val prefs = Prefs(context.applicationContext)
        val base = prefs.baseUrl
        val token = prefs.deviceToken
        val brandId = prefs.brandId
        if (base.isBlank() || token.isBlank() || brandId.isBlank()) return false
        if (!Prefs.isAllowedBaseUrl(base)) return false
        return try {
            val result = CompanionApi(base).postHeartbeat(token, brandId)
            if (result.ok) {
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

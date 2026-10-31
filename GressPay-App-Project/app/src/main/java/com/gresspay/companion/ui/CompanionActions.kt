package com.gresspay.companion.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.gresspay.companion.api.ApiException
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.sms.InboxScanner
import com.gresspay.companion.sms.SmsMatchService
import com.gresspay.companion.sync.CompanionHeartbeat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class CompanionUiState(
    val baseUrl: String = "",
    val apiKey: String = "",
    val deviceId: String = "",
    val deviceToken: String = "",
    val paired: Boolean = false,
    val matchingEnabled: Boolean = false,
    val consentAccepted: Boolean = false,
    val captured: Int = 0,
    val matched: Int = 0,
    val latencyMs: Long = -1L,
    val lastError: String = "",
    val statusLabel: String = "DISCONNECTED",
)

class CompanionActions(private val context: Context, private val prefs: Prefs) {

    fun readState(): CompanionUiState {
        val paired = prefs.deviceToken.isNotBlank() && prefs.baseUrl.isNotBlank()
        val matching = prefs.matchingEnabled && paired
        val label = when {
            matching -> "MATCHING"
            paired -> "PAIRED"
            else -> "DISCONNECTED"
        }
        return CompanionUiState(
            baseUrl = prefs.baseUrl.ifBlank { DEFAULT_BASE },
            apiKey = prefs.apiKey,
            deviceId = prefs.deviceId,
            deviceToken = prefs.deviceToken,
            paired = paired,
            matchingEnabled = prefs.matchingEnabled,
            consentAccepted = prefs.consentAccepted,
            captured = prefs.totalSmsCaptured,
            matched = prefs.totalPaymentsMatched,
            latencyMs = prefs.lastPingLatencyMs,
            lastError = prefs.lastError,
            statusLabel = label,
        )
    }

    suspend fun saveApiKey(baseUrl: String, apiKey: String): Result<Unit> = withContext(Dispatchers.IO) {
        val base = baseUrl.trim().trimEnd('/')
        if (base.isBlank() || !Prefs.isAllowedBaseUrl(base)) {
            return@withContext Result.failure(IllegalArgumentException("API URL must be HTTPS"))
        }
        if (apiKey.isBlank() || !(apiKey.startsWith("gp_live_") || apiKey.startsWith("gp_test_"))) {
            return@withContext Result.failure(IllegalArgumentException("Enter a gp_live_ or gp_test_ API key"))
        }
        prefs.baseUrl = base
        prefs.apiKey = apiKey
        CompanionHeartbeat.sendIfConfigured(context)
        Result.success(Unit)
    }

    suspend fun registerDevice(baseUrl: String, apiKey: String): Result<String> = withContext(Dispatchers.IO) {
        val base = baseUrl.trim().trimEnd('/')
        if (!Prefs.isAllowedBaseUrl(base)) {
            return@withContext Result.failure(IllegalArgumentException("Invalid API URL"))
        }
        prefs.baseUrl = base
        prefs.apiKey = apiKey.trim()
        try {
            val result = CompanionApi(base).registerDevice(apiKey.trim())
            prefs.deviceId = result.deviceId
            prefs.deviceToken = result.token
            if (result.brandId.isNotBlank()) prefs.brandId = result.brandId
            CompanionHeartbeat.sendIfConfigured(context)
            Result.success(result.token)
        } catch (e: ApiException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun ping(): Result<Long> = withContext(Dispatchers.IO) {
        val base = prefs.baseUrl
        if (base.isBlank()) return@withContext Result.failure(IllegalStateException("Configure API first"))
        try {
            val result = if (prefs.deviceToken.isNotBlank() && prefs.brandId.isNotBlank()) {
                CompanionApi(base).postHeartbeat(prefs.deviceToken, prefs.brandId)
            } else {
                CompanionApi(base).ping(prefs.deviceToken)
            }
            if (result.ok) {
                prefs.lastPingLatencyMs = result.latencyMs.toLong()
                Result.success(result.latencyMs.toLong())
            } else {
                prefs.lastError = result.message
                Result.failure(IllegalStateException(result.message))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun enableMatching(): Boolean {
        if (prefs.deviceToken.isBlank()) return false
        prefs.matchingEnabled = true
        return SmsMatchService.start(context)
    }

    fun disableMatching() {
        prefs.matchingEnabled = false
        SmsMatchService.stop(context)
    }

    fun acceptConsent() {
        prefs.consentAccepted = true
    }

    fun completeOnboarding() {
        prefs.onboardingComplete = true
    }

    fun openBatterySettings(): Intent =
        Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)

    fun openAutoStartSettings(): Intent {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val intent = when {
            manufacturer.contains("xiaomi") -> Intent().setClassName(
                "com.miui.securitycenter",
                "com.miui.permcenter.autostart.AutoStartManagementActivity"
            )
            manufacturer.contains("oppo") -> Intent().setClassName(
                "com.coloros.safecenter",
                "com.coloros.safecenter.permission.startup.StartupAppListActivity"
            )
            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", context.packageName, null)
            }
        }
        return intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }

    suspend fun scanInbox(): Result<String> = withContext(Dispatchers.IO) {
        try {
            val result = InboxScanner.scanAndEnqueue(context)
            Result.success("Scanned ${result.scanned}, enqueued ${result.enqueued}")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    companion object {
        const val DEFAULT_BASE = "https://gresspay.extxcheats.com"
        const val PRIVACY_URL = "https://gresspay.extxcheats.com/privacy"
        const val TERMS_URL = "https://gresspay.extxcheats.com/terms"
    }
}

package com.gresspay.companion.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.gresspay.companion.api.ApiException
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.api.VerifyResult
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
    val brandName: String = "",
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
        val paired = prefs.deviceToken.isNotBlank() && prefs.baseUrl.isNotBlank() && prefs.brandId.isNotBlank()
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
            brandName = prefs.brandName,
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

    suspend fun pairDeviceCredentials(
        deviceToken: String,
        baseUrlOverride: String = "",
    ): Result<Unit> = withContext(Dispatchers.IO) {
        val token = deviceToken.trim()
        if (!token.startsWith("gpdev_")) {
            val msg = if (token.startsWith("gp_live_")) {
                "Website key (gp_live_…) গ্রহণযোগ্য নয় — Dashboard → Devices থেকে Device API key (gpdev_…) পেস্ট করুন। " +
                    "Do not paste gp_live_…; use the Device API key (gpdev_…) from Dashboard → Devices only."
            } else {
                "Device API key (gpdev_…) লাগবে — Dashboard → Devices থেকে কপি করুন। " +
                    "Paste the Device API key (gpdev_…) from Dashboard → Devices."
            }
            return@withContext Result.failure(IllegalArgumentException(msg))
        }
        val base = normalizeBase(baseUrlOverride.ifBlank { prefs.baseUrl.ifBlank { DEFAULT_BASE } })
        if (!Prefs.isAllowedBaseUrl(base)) {
            return@withContext Result.failure(IllegalArgumentException("API URL must be HTTPS (site root, no /api/v1)"))
        }
        prefs.baseUrl = base
        prefs.deviceToken = token
        prefs.apiKey = ""
        try {
            val api = CompanionApi(base)
            val configBase = api.fetchPublicConfig()
            if (configBase.isNotBlank() && Prefs.isAllowedBaseUrl(configBase)) {
                prefs.baseUrl = configBase
            }
            val verify = CompanionApi(prefs.baseUrl).postVerify(token)
            if (!verify.ok) {
                prefs.clearDevice()
                return@withContext Result.failure(IllegalStateException(verify.message.ifBlank { "Verification failed" }))
            }
            applyPairingFromServer(verify)
            CompanionHeartbeat.sendIfConfigured(context)
            Result.success(Unit)
        } catch (e: ApiException) {
            prefs.clearDevice()
            Result.failure(e)
        } catch (e: Exception) {
            prefs.clearDevice()
            Result.failure(e)
        }
    }

    /** @deprecated Devices are created in the dashboard; use [pairDeviceCredentials]. */
    suspend fun registerDevice(baseUrl: String, apiKey: String): Result<String> = withContext(Dispatchers.IO) {
        Result.failure(
            IllegalStateException("Create the device in GressPay Dashboard → Devices, then paste the gpdev_ key here.")
        )
    }

    suspend fun ping(): Result<Long> = withContext(Dispatchers.IO) {
        val base = prefs.baseUrl
        if (base.isBlank()) return@withContext Result.failure(IllegalStateException("Configure API first"))
        try {
            val result = if (prefs.deviceToken.isNotBlank()) {
                CompanionApi(base).postHeartbeat(prefs.deviceToken, prefs.brandId)
            } else {
                CompanionApi(base).ping(prefs.deviceToken)
            }
            if (result.ok) {
                applyPairingFromServer(
                    VerifyResult(
                        ok = true,
                        deviceId = result.deviceId,
                        brandId = result.brandId,
                        brandName = prefs.brandName,
                        apiBaseUrl = result.apiBaseUrl,
                        latencyMs = result.latencyMs,
                        message = "",
                    )
                )
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

    private fun applyPairingFromServer(verify: VerifyResult) {
        if (verify.deviceId.isNotBlank()) {
            prefs.deviceId = verify.deviceId
        }
        if (verify.brandId.isNotBlank()) {
            prefs.brandId = verify.brandId
        }
        if (verify.brandName.isNotBlank()) {
            prefs.brandName = verify.brandName
        }
        if (verify.apiBaseUrl.isNotBlank() && Prefs.isAllowedBaseUrl(verify.apiBaseUrl)) {
            prefs.baseUrl = verify.apiBaseUrl
        }
    }

    private fun normalizeBase(raw: String): String =
        raw.trim().trimEnd('/').replace(Regex("/api/v1/?$", RegexOption.IGNORE_CASE), "")

    companion object {
        const val DEFAULT_BASE = "https://gresspay.extxcheats.com"
        const val PRIVACY_URL = "https://gresspay.extxcheats.com/privacy"
        const val TERMS_URL = "https://gresspay.extxcheats.com/terms"
    }
}

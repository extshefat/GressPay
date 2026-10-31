package com.gresspay.companion.api

import com.gresspay.companion.data.Prefs
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class RegisterResult(val deviceId: String, val token: String, val brandId: String)
data class PingResult(
    val ok: Boolean,
    val latencyMs: Long,
    val message: String,
    val brandId: String = "",
    val apiBaseUrl: String = "",
    val deviceId: String = "",
)
data class VerifyResult(
    val ok: Boolean,
    val deviceId: String,
    val brandId: String,
    val brandName: String,
    val apiBaseUrl: String,
    val latencyMs: Long,
    val message: String,
)
data class SmsPostResult(
    val ok: Boolean,
    val matched: Boolean,
    val message: String,
    val httpCode: Int = 0,
    val permanentFailure: Boolean = false
)

/**
 * Talks to GressPay PHP companion routes under /api/v1/companion/.
 */
class CompanionApi(
    private val baseUrl: String,
    private val client: OkHttpClient = defaultClient()
) {
    init {
        require(Prefs.isAllowedBaseUrl(baseUrl)) {
            "API base URL must be HTTPS (or http loopback for local debug)."
        }
    }

    fun postVerify(deviceToken: String, brandIdHint: String = ""): VerifyResult {
        val url = "$baseUrl/api/v1/companion/verify"
        val builder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .header("X-GressPay-Device", deviceToken)
            .header("Content-Type", "application/json")
        if (brandIdHint.isNotBlank()) {
            builder.header("X-GressPay-Brand", brandIdHint)
        }
        val req = builder.post("{}".toRequestBody(JSON)).build()
        val started = System.nanoTime()
        return try {
            client.newCall(req).execute().use { res ->
                val ms = (System.nanoTime() - started) / 1_000_000L
                val raw = res.body?.string().orEmpty()
                if (res.isSuccessful) {
                    val json = JSONObject(raw)
                    VerifyResult(
                        ok = json.optBoolean("ok", true),
                        deviceId = json.optString("deviceId", ""),
                        brandId = json.optString("brandId", ""),
                        brandName = json.optString("brandName", ""),
                        apiBaseUrl = json.optString("apiBaseUrl", "").trim().trimEnd('/'),
                        latencyMs = ms,
                        message = "",
                    )
                } else {
                    VerifyResult(false, "", "", "", "", ms, parseError(raw, res.code))
                }
            }
        } catch (e: Exception) {
            val ms = (System.nanoTime() - started) / 1_000_000L
            VerifyResult(false, "", "", "", "", ms, e.message ?: "network_error")
        }
    }

    fun fetchPublicConfig(): String {
        val url = "$baseUrl/api/v1/companion/public-config"
        val req = Request.Builder().url(url).get().build()
        client.newCall(req).execute().use { res ->
            val raw = res.body?.string().orEmpty()
            if (!res.isSuccessful) return ""
            return JSONObject(raw).optString("apiBaseUrl", "").trim().trimEnd('/')
        }
    }

    fun postHeartbeat(deviceToken: String, brandId: String = ""): PingResult {
        val url = "$baseUrl/api/v1/companion/heartbeat"
        val builder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .header("X-GressPay-Device", deviceToken)
            .header("Content-Type", "application/json")
        if (brandId.isNotBlank()) {
            builder.header("X-GressPay-Brand", brandId)
        }
        val req = builder.post("{}".toRequestBody(JSON)).build()
        val started = System.nanoTime()
        return try {
            client.newCall(req).execute().use { res ->
                val ms = (System.nanoTime() - started) / 1_000_000L
                val raw = res.body?.string().orEmpty()
                if (res.isSuccessful) {
                    parseAuthResponse(raw, ms).let {
                        PingResult(
                            true,
                            ms,
                            it.deviceId.ifBlank { "heartbeat OK" },
                            it.brandId,
                            it.apiBaseUrl,
                            it.deviceId,
                        )
                    }
                } else {
                    PingResult(false, ms, parseError(raw, res.code))
                }
            }
        } catch (e: Exception) {
            val ms = (System.nanoTime() - started) / 1_000_000L
            PingResult(false, ms, e.message ?: "network_error")
        }
    }

    fun ping(deviceToken: String = ""): PingResult {
        val url = "$baseUrl/api/v1/health"
        val builder = Request.Builder().url(url).get()
        if (deviceToken.isNotBlank()) {
            builder.header("Authorization", "Bearer $deviceToken")
        }
        val started = System.nanoTime()
        return try {
            client.newCall(builder.build()).execute().use { res ->
                val ms = (System.nanoTime() - started) / 1_000_000L
                if (res.isSuccessful) {
                    PingResult(true, ms, "HTTP ${res.code}")
                } else {
                    PingResult(false, ms, "HTTP ${res.code}")
                }
            }
        } catch (e: Exception) {
            val ms = (System.nanoTime() - started) / 1_000_000L
            PingResult(false, ms, e.message ?: "network_error")
        }
    }

    fun registerDevice(merchantApiKey: String): RegisterResult {
        val url = "$baseUrl/api/v1/companion/register"
        val body = "{}".toRequestBody(JSON)
        val req = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $merchantApiKey")
            .header("Content-Type", "application/json")
            .post(body)
            .build()
        client.newCall(req).execute().use { res ->
            val raw = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                throw ApiException(parseError(raw, res.code), res.code)
            }
            val json = JSONObject(raw)
            return RegisterResult(
                deviceId = json.getString("deviceId"),
                token = json.getString("token"),
                brandId = json.optString("brandId", "")
            )
        }
    }

    fun postPaymentSms(
        deviceToken: String,
        brandId: String,
        senderKey: String,
        amount: String,
        trxId: String,
        number: String,
        idempotencyKey: String
    ): SmsPostResult {
        val url = "$baseUrl/api/v1/companion/sms"
        val payload = JSONObject()
            .put("sender_key", senderKey)
            .put("amount", amount)
            .put("trx_id", trxId)
            .put("number", number)
            .put("idempotency_key", idempotencyKey)
            .toString()
        val builder = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .header("X-GressPay-Device", deviceToken)
            .header("Content-Type", "application/json")
        if (brandId.isNotBlank()) {
            builder.header("X-GressPay-Brand", brandId)
        }
        val req = builder.post(payload.toRequestBody(JSON)).build()
        client.newCall(req).execute().use { res ->
            val raw = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                val permanent = res.code in 400..499 && res.code != 408 && res.code != 429
                return SmsPostResult(
                    ok = false,
                    matched = false,
                    message = parseError(raw, res.code),
                    httpCode = res.code,
                    permanentFailure = permanent
                )
            }
            val json = JSONObject(raw)
            return SmsPostResult(
                ok = json.optBoolean("ok", true),
                matched = json.optBoolean("matched", false),
                message = if (json.optBoolean("matched", false)) "matched" else "stored",
                httpCode = res.code
            )
        }
    }

    private fun parseError(raw: String, code: Int): String {
        return try {
            val err = JSONObject(raw).optJSONObject("error")
            err?.optString("message")?.takeIf { it.isNotBlank() }
                ?: "HTTP $code"
        } catch (_: Exception) {
            "HTTP $code"
        }
    }

    private fun parseAuthResponse(raw: String, latencyMs: Long): VerifyResult {
        return try {
            val json = JSONObject(raw)
            VerifyResult(
                ok = json.optBoolean("ok", true),
                deviceId = json.optString("deviceId", ""),
                brandId = json.optString("brandId", ""),
                brandName = json.optString("brandName", ""),
                apiBaseUrl = json.optString("apiBaseUrl", "").trim().trimEnd('/'),
                latencyMs = latencyMs,
                message = "",
            )
        } catch (_: Exception) {
            VerifyResult(false, "", "", "", "", latencyMs, "invalid_response")
        }
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        fun defaultClient(): OkHttpClient = OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .build()
    }
}

class ApiException(message: String, val httpCode: Int = 0) : Exception(message)

package com.gresspay.companion.api

import com.gresspay.companion.data.Prefs
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class RegisterResult(val deviceId: String, val token: String, val brandId: String)
data class PingResult(val ok: Boolean, val latencyMs: Long, val message: String)
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
        val req = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .header("X-GressPay-Device", deviceToken)
            .header("X-GressPay-Brand", brandId)
            .header("Content-Type", "application/json")
            .post(payload.toRequestBody(JSON))
            .build()
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

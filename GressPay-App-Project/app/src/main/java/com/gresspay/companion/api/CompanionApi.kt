package com.gresspay.companion.api

import com.gresspay.companion.data.Prefs
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class RegisterResult(val deviceId: String, val token: String)
data class SmsPostResult(val ok: Boolean, val matched: Boolean, val message: String)

/**
 * Talks to GressPay PHP companion routes under /api/v1/companion/*
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

    fun ping(deviceToken: String): Boolean {
        val url = "$baseUrl/api/v1/health"
        val req = Request.Builder()
            .url(url)
            .header("Authorization", "Bearer $deviceToken")
            .get()
            .build()
        return try {
            client.newCall(req).execute().use { it.isSuccessful }
        } catch (_: Exception) {
            false
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
                throw ApiException(parseError(raw, res.code))
            }
            val json = JSONObject(raw)
            return RegisterResult(
                deviceId = json.getString("deviceId"),
                token = json.getString("token")
            )
        }
    }

    fun postPaymentSms(
        deviceToken: String,
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
            .header("Content-Type", "application/json")
            .post(payload.toRequestBody(JSON))
            .build()
        client.newCall(req).execute().use { res ->
            val raw = res.body?.string().orEmpty()
            if (!res.isSuccessful) {
                return SmsPostResult(false, false, parseError(raw, res.code))
            }
            val json = JSONObject(raw)
            return SmsPostResult(
                ok = json.optBoolean("ok", true),
                matched = json.optBoolean("matched", false),
                message = if (json.optBoolean("matched", false)) "matched" else "stored"
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

class ApiException(message: String) : Exception(message)

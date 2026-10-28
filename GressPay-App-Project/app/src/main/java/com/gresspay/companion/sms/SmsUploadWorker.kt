package com.gresspay.companion.sms

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs
import java.security.MessageDigest

class SmsUploadWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val prefs = Prefs(applicationContext)
        if (!prefs.matchingEnabled || !prefs.consentAccepted) return Result.success()
        val base = prefs.baseUrl
        val token = prefs.deviceToken
        if (base.isBlank() || token.isBlank()) return Result.failure()
        if (!Prefs.isAllowedBaseUrl(base)) {
            prefs.lastError = "Insecure API URL blocked"
            return Result.failure()
        }

        val senderKey = inputData.getString(KEY_SENDER) ?: return Result.failure()
        val amount = inputData.getString(KEY_AMOUNT) ?: return Result.failure()
        val trx = inputData.getString(KEY_TRX) ?: return Result.failure()
        val number = inputData.getString(KEY_NUMBER).orEmpty()
        val idem = inputData.getString(KEY_IDEM)
            ?: sha256("$senderKey|$amount|$trx")

        return try {
            val api = CompanionApi(base)
            val res = api.postPaymentSms(token, senderKey, amount, trx, number, idem)
            if (res.ok) {
                prefs.lastSyncAt = System.currentTimeMillis()
                prefs.lastError = ""
                prefs.totalSmsCaptured = prefs.totalSmsCaptured + 1
                if (res.matched) {
                    prefs.totalPaymentsMatched = prefs.totalPaymentsMatched + 1
                }
                Result.success()
            } else {
                prefs.lastError = res.message
                Result.retry()
            }
        } catch (e: Exception) {
            prefs.lastError = e.message ?: "upload_failed"
            Result.retry()
        }
    }

    companion object {
        const val KEY_SENDER = "sender_key"
        const val KEY_AMOUNT = "amount"
        const val KEY_TRX = "trx_id"
        const val KEY_NUMBER = "number"
        const val KEY_IDEM = "idempotency_key"

        fun sha256(s: String): String {
            val dig = MessageDigest.getInstance("SHA-256").digest(s.toByteArray())
            return dig.joinToString("") { "%02x".format(it) }
        }
    }
}

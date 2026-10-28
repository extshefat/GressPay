package com.gresspay.companion.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit
import com.gresspay.companion.data.Prefs

/**
 * Receives SMS only when matching is opted-in. Parses payment fields and
 * enqueues a network upload — never stores the full message body.
 */
class SmsBroadcastReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val prefs = Prefs(context)
        if (!prefs.matchingEnabled || !prefs.consentAccepted) return
        if (prefs.deviceToken.isBlank() || prefs.baseUrl.isBlank()) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (messages.isEmpty()) return

        val from = messages[0].displayOriginatingAddress.orEmpty()
        val body = messages.joinToString(separator = "") { it.displayMessageBody.orEmpty() }
        val parsed = PaymentSmsParser.parse(from, body) ?: return

        val idem = SmsUploadWorker.sha256("${parsed.senderKey}|${parsed.amount}|${parsed.trxId}")
        val data = workDataOf(
            SmsUploadWorker.KEY_SENDER to parsed.senderKey,
            SmsUploadWorker.KEY_AMOUNT to parsed.amount,
            SmsUploadWorker.KEY_TRX to parsed.trxId,
            SmsUploadWorker.KEY_NUMBER to parsed.fromNumber,
            SmsUploadWorker.KEY_IDEM to idem
        )
        val req = OneTimeWorkRequestBuilder<SmsUploadWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            .setInputData(data)
            .addTag("sms_$idem")
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork("sms_$idem", ExistingWorkPolicy.KEEP, req)
    }
}

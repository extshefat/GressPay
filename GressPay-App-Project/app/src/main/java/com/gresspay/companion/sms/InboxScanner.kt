package com.gresspay.companion.sms

import android.content.Context
import android.provider.Telephony
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import java.util.concurrent.TimeUnit

data class InboxScanResult(
    val scanned: Int,
    val enqueued: Int,
    val skipped: Int
)

/**
 * Backfill payment SMS from the device inbox for the last [windowMs] (default 24h).
 * Requires READ_SMS. Never stores full message bodies — only parsed fields go to WorkManager.
 */
object InboxScanner {
    private const val DEFAULT_WINDOW_MS = 24L * 60L * 60L * 1000L

    fun scanAndEnqueue(
        context: Context,
        windowMs: Long = DEFAULT_WINDOW_MS
    ): InboxScanResult {
        val cutoff = System.currentTimeMillis() - windowMs
        val uri = Telephony.Sms.Inbox.CONTENT_URI
        val projection = arrayOf(
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE
        )
        var scanned = 0
        var enqueued = 0
        var skipped = 0

        context.contentResolver.query(
            uri,
            projection,
            "${Telephony.Sms.DATE} >= ?",
            arrayOf(cutoff.toString()),
            "${Telephony.Sms.DATE} DESC"
        )?.use { cursor ->
            val idxAddr = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
            val idxBody = cursor.getColumnIndex(Telephony.Sms.BODY)
            while (cursor.moveToNext()) {
                scanned++
                val from = if (idxAddr >= 0) cursor.getString(idxAddr).orEmpty() else ""
                val body = if (idxBody >= 0) cursor.getString(idxBody).orEmpty() else ""
                val parsed = PaymentSmsParser.parse(from, body)
                if (parsed == null) {
                    skipped++
                    continue
                }
                enqueueParsed(context, parsed)
                enqueued++
            }
        }

        return InboxScanResult(scanned, enqueued, skipped)
    }

    fun enqueueParsed(context: Context, parsed: ParsedPaymentSms) {
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
        WorkManager.getInstance(context)
            .enqueueUniqueWork("sms_$idem", ExistingWorkPolicy.KEEP, req)
    }
}

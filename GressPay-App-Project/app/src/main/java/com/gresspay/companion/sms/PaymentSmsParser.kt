package com.gresspay.companion.sms

import java.util.Locale
import java.util.regex.Pattern

data class ParsedPaymentSms(
    val senderKey: String,
    val amount: String,
    val trxId: String,
    val fromNumber: String
)

/**
 * Enterprise-grade parser for Bangladesh MFS payment receipts:
 * bKash, Nagad, Rocket (DBBL), Upay (UCB), and Cellfin (IBBL).
 */
object PaymentSmsParser {

    private val BKASH_SENDERS = setOf("16247", "bkash", "bkas")
    private val NAGAD_SENDERS = setOf("16262", "nagad")
    private val ROCKET_SENDERS = setOf("16216", "rocket", "dbbl")
    private val UPAY_SENDERS = setOf("16268", "upay", "ucb")
    private val CELLFIN_SENDERS = setOf("16259", "cellfin", "ibbl")

    private val AMOUNT_PATTERNS = listOf(
        Pattern.compile("(?i)(?:tk\\.?|bdt)\\s*([0-9]+(?:[.,][0-9]{1,2})?)"),
        Pattern.compile("(?i)(?:received|credited|payment|cash\\s*in)\\s*(?:of\\s*)?(?:tk\\.?|bdt)?\\s*([0-9]+(?:[.,][0-9]{1,2})?)"),
        Pattern.compile("(?i)\\b([0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:tk\\.?|bdt)\\b")
    )

    private val TRX_PATTERNS = listOf(
        Pattern.compile("(?i)(?:trx(?:id)?|txn(?:id)?|transaction\\s*id)\\s*[:#]?\\s*([A-Za-z0-9]{6,24})"),
        Pattern.compile("(?i)\\b(?:TrxID|TxnID|Ref)\\s*[:#]?\\s*([A-Za-z0-9]{6,24})")
    )

    fun parse(fromAddress: String, body: String): ParsedPaymentSms? {
        val senderKey = resolveSender(fromAddress, body) ?: return null
        val amount = extractAmount(body) ?: return null
        val trx = extractTrx(body) ?: return null
        return ParsedPaymentSms(
            senderKey = senderKey,
            amount = amount,
            trxId = trx,
            fromNumber = fromAddress.filter { it.isDigit() || it == '+' }.ifBlank { fromAddress }
        )
    }

    private fun resolveSender(from: String, body: String): String? {
        val fromNorm = from.trim().lowercase(Locale.US)
        val digits = from.filter { it.isDigit() }
        val upperBody = body.uppercase(Locale.US)

        // 1. Direct shortcode or sender title matching
        if (digits in setOf("16247") || BKASH_SENDERS.any { fromNorm.contains(it) }) return "bkash"
        if (digits in setOf("16262") || NAGAD_SENDERS.any { fromNorm.contains(it) }) return "nagad"
        if (digits in setOf("16216") || ROCKET_SENDERS.any { fromNorm.contains(it) }) return "rocket"
        if (digits in setOf("16268") || UPAY_SENDERS.any { fromNorm.contains(it) }) return "upay"
        if (digits in setOf("16259") || CELLFIN_SENDERS.any { fromNorm.contains(it) }) return "cellfin"

        // 2. Body signature fallback (when gateway alters caller ID)
        val matches = mutableListOf<String>()
        if ("BKASH" in upperBody) matches.add("bkash")
        if ("NAGAD" in upperBody) matches.add("nagad")
        if ("ROCKET" in upperBody || "DBBL" in upperBody) matches.add("rocket")
        if ("UPAY" in upperBody) matches.add("upay")
        if ("CELLFIN" in upperBody || "IBBL" in upperBody) matches.add("cellfin")

        return if (matches.size == 1) matches[0] else null
    }

    private fun extractAmount(body: String): String? {
        for (p in AMOUNT_PATTERNS) {
            val m = p.matcher(body)
            if (m.find()) {
                val raw = m.group(1)?.replace(",", "")?.trim() ?: continue
                if (raw.toDoubleOrNull() == null || raw.toDouble() <= 0) continue
                return raw
            }
        }
        return null
    }

    private fun extractTrx(body: String): String? {
        for (p in TRX_PATTERNS) {
            val m = p.matcher(body)
            if (m.find()) {
                val candidate = m.group(1)?.trim().orEmpty()
                if (candidate.length < 6) continue
                // Reject pure short numeric amounts mistakenly matched
                if (candidate.matches(Regex("^[0-9]+(\\.[0-9]+)?$")) && candidate.length <= 6) continue
                return candidate.uppercase(Locale.US)
            }
        }
        return null
    }
}

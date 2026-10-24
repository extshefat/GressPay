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
 * Conservative parser for first-release Bangladesh rails only (bKash + Nagad).
 * If sender, amount, or TxID is ambiguous — return null (do not upload a guess).
 */
object PaymentSmsParser {

    private val BKASH_SENDERS = setOf("16247", "bkash", "bkas")
    private val NAGAD_SENDERS = setOf("16262", "nagad")

    private val AMOUNT_PATTERNS = listOf(
        Pattern.compile("(?i)(?:tk\\.?|bdt)\\s*([0-9]+(?:[.,][0-9]{1,2})?)"),
        Pattern.compile("(?i)(?:received|credited|payment)\\s*(?:of\\s*)?(?:tk\\.?|bdt)?\\s*([0-9]+(?:[.,][0-9]{1,2})?)"),
        Pattern.compile("(?i)\\b([0-9]+(?:[.,][0-9]{1,2})?)\\s*(?:tk\\.?|bdt)\\b")
    )

    private val TRX_LABELED = Pattern.compile(
        "(?i)(?:trx(?:id)?|txn(?:id)?|transaction\\s*id)\\s*[:#]?\\s*([A-Za-z0-9]{8,20})"
    )

    fun parse(fromAddress: String, body: String): ParsedPaymentSms? {
        val senderKey = resolveSender(fromAddress, body) ?: return null
        // First release: only bkash / nagad
        if (senderKey != "bkash" && senderKey != "nagad") return null
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
        when {
            digits in setOf("16247") || BKASH_SENDERS.any { fromNorm.contains(it) } -> return "bkash"
            digits in setOf("16262") || NAGAD_SENDERS.any { fromNorm.contains(it) } -> return "nagad"
        }
        val upper = body.uppercase(Locale.US)
        val hasBkash = "BKASH" in upper
        val hasNagad = "NAGAD" in upper
        // Ambiguous if both labels appear
        if (hasBkash && hasNagad) return null
        if (hasBkash) return "bkash"
        if (hasNagad) return "nagad"
        return null
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
        val m = TRX_LABELED.matcher(body)
        if (!m.find()) return null
        val candidate = m.group(1)?.trim().orEmpty()
        if (candidate.length < 8) return null
        // Reject pure short numeric amounts mistaken as trx
        if (candidate.matches(Regex("^[0-9]+(\\.[0-9]+)?$")) && candidate.length <= 8) return null
        return candidate
    }
}

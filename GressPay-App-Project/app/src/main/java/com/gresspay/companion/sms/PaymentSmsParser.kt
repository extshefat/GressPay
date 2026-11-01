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
 * Bangladesh MFS payment receipt parser (bKash, Nagad, Rocket, Upay, Cellfin).
 * Accepts only clearly identified **incoming credit** notifications.
 * Outgoing/debit/refund/ambiguous bodies are rejected so they cannot settle checkouts.
 */
object PaymentSmsParser {

    private val BKASH_SENDERS = setOf("16247", "bkash", "bkas")
    private val NAGAD_SENDERS = setOf("16167", "16262", "nagad")
    private val ROCKET_SENDERS = setOf("16216", "rocket", "dbbl")
    private val UPAY_SENDERS = setOf("16268", "upay", "ucb")
    private val CELLFIN_SENDERS = setOf("16259", "cellfin", "ibbl")

    private val OTP_NOISE = Pattern.compile(
        "(?i)\\b(otp|one[- ]?time\\s*(?:pass(?:word|code)?|pin)|verification\\s*code|login\\s*code|" +
            "auth(?:entication)?\\s*code|pin\\s*code|security\\s*code|do\\s*not\\s*share)\\b"
    )
    private val PROMO_NOISE = Pattern.compile(
        "(?i)\\b(cashback|discount|offer|promo(?:tion)?|exclusive\\s*deal|win\\s*a\\s*prize|" +
            "subscribe|unsubscribe|click\\s*here|download\\s*app)\\b"
    )

    /** Outgoing / debit / refund — never treat as merchant cash-in. */
    private val DEBIT_REJECT = Pattern.compile(
        "(?i)\\b(" +
            "sent\\s+tk|sent\\s+bdt|you\\s+have\\s+sent|you\\s+sent|" +
            "paid\\s+to|payment\\s+to|payment\\s+of\\s+tk\\s+[0-9].*\\bto\\b|" +
            "cash\\s*out|withdrawn|withdrawal|debited|debit\\b|" +
            "transfer(?:red)?\\s+to|refund(?:ed)?|reversal|reversed|" +
            "purchase\\s+of|bought|bill\\s+pay" +
            ")\\b"
    )

    /** Must see a clear credit / receive marker before accepting. */
    private val CREDIT_MARKERS = Pattern.compile(
        "(?i)\\b(" +
            "you\\s+have\\s+received|you\\s+received|have\\s+received|" +
            "received\\s+(?:tk\\.?|bdt)|" +
            "credited(?:\\s+with)?|" +
            "cash\\s*in|" +
            "has\\s+been\\s+credited|" +
            "received\\s+from" +
            ")\\b"
    )

    // Supports 500, 500.00, 1,250.00 style amounts — only after credit direction is confirmed.
    private val AMOUNT_TOKEN = "([0-9]{1,3}(?:,[0-9]{3})+(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)"
    private val AMOUNT_PATTERNS = listOf(
        Pattern.compile("(?i)(?:received|credited|cash\\s*in)\\s*(?:of\\s*|with\\s*)?(?:tk\\.?|bdt)?\\s*$AMOUNT_TOKEN"),
        Pattern.compile("(?i)(?:tk\\.?|bdt)\\s*$AMOUNT_TOKEN"),
        Pattern.compile("(?i)\\b$AMOUNT_TOKEN\\s*(?:tk\\.?|bdt)\\b")
    )

    private val TRX_PATTERNS = listOf(
        Pattern.compile("(?i)(?:trx(?:id)?|txn(?:id)?|transaction\\s*id)\\s*[:#]?\\s*([A-Za-z0-9]{6,24})"),
        Pattern.compile("(?i)\\b(?:TrxID|TxnID|Ref)\\s*[:#]?\\s*([A-Za-z0-9]{6,24})")
    )

    fun parse(fromAddress: String, body: String): ParsedPaymentSms? {
        if (isNoise(body)) return null
        if (isDebitOrOutgoing(body)) return null
        if (!isCreditReceipt(body)) return null
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

    /** OTP / login / promo bodies must never enqueue uploads. */
    fun isNoise(body: String): Boolean {
        val trimmed = body.trim()
        if (trimmed.isEmpty()) return true
        if (OTP_NOISE.matcher(trimmed).find()) return true
        if (PROMO_NOISE.matcher(trimmed).find() && !hasCreditPaymentMarkers(trimmed)) return true
        return false
    }

    fun isDebitOrOutgoing(body: String): Boolean = DEBIT_REJECT.matcher(body).find()

    fun isCreditReceipt(body: String): Boolean = CREDIT_MARKERS.matcher(body).find()

    private fun hasCreditPaymentMarkers(body: String): Boolean {
        return isCreditReceipt(body) &&
            (body.uppercase(Locale.US).contains("TRX") || body.uppercase(Locale.US).contains("TXN")) &&
            extractAmount(body) != null
    }

    private fun resolveSender(from: String, body: String): String? {
        val fromNorm = from.trim().lowercase(Locale.US)
        val digits = from.filter { it.isDigit() }
        val upperBody = body.uppercase(Locale.US)

        if (digits in setOf("16247") || BKASH_SENDERS.any { fromNorm.contains(it) }) return "bkash"
        if (digits in setOf("16167", "16262") || NAGAD_SENDERS.any { fromNorm.contains(it) }) return "nagad"
        if (digits in setOf("16216") || ROCKET_SENDERS.any { fromNorm.contains(it) }) return "rocket"
        if (digits in setOf("16268") || UPAY_SENDERS.any { fromNorm.contains(it) }) return "upay"
        if (digits in setOf("16259") || CELLFIN_SENDERS.any { fromNorm.contains(it) }) return "cellfin"

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
                // Reject bare decimals / short numeric noise mistaken for TrxID.
                if (candidate.matches(Regex("^[0-9]+(\\.[0-9]+)?$")) && candidate.length <= 6) continue
                if (!candidate.matches(Regex("^[A-Za-z0-9]{6,24}$"))) continue
                return candidate.uppercase(Locale.US)
            }
        }
        return null
    }
}

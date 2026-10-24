package com.gresspay.companion.sms

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class PaymentSmsParserTest {

    @Test
    fun parsesBkashCredit() {
        val body =
            "You have received Tk 500.00 from 017XXXXXXXX. Fee Tk 0.00. Balance Tk 1,200.00. TrxID 8N2K4M9P1Q Ref."
        val p = PaymentSmsParser.parse("16247", body)
        assertNotNull(p)
        assertEquals("bkash", p!!.senderKey)
        assertEquals("500.00", p.amount)
        assertEquals("8N2K4M9P1Q", p.trxId)
    }

    @Test
    fun parsesBkashBodyLabelWithoutShortcode() {
        val body = "BKASH: You received Tk 75.25. TrxID XYZABCDE12"
        val p = PaymentSmsParser.parse("UnknownSender", body)
        assertNotNull(p)
        assertEquals("bkash", p!!.senderKey)
        assertEquals("75.25", p.amount)
        assertEquals("XYZABCDE12", p.trxId)
    }

    @Test
    fun parsesNagadCredit() {
        val body =
            "Cash In Tk 250.50 to your Nagad Account. TrxID AB12CD34EF successful."
        val p = PaymentSmsParser.parse("16262", body)
        assertNotNull(p)
        assertEquals("nagad", p!!.senderKey)
        assertEquals("250.50", p.amount)
        assertEquals("AB12CD34EF", p.trxId)
    }

    @Test
    fun parsesAmountWithCommaThousands() {
        val body = "You have received Tk 1,250.00 from 017. TrxID COMMATHX99"
        val p = PaymentSmsParser.parse("16247", body)
        assertNotNull(p)
        assertEquals("1250.00", p!!.amount)
    }

    @Test
    fun parsesTxnIdAlias() {
        val body = "Payment of Tk 10 credited. TxnID ALIAS1234XY"
        val p = PaymentSmsParser.parse("16247", body)
        assertNotNull(p)
        assertEquals("ALIAS1234XY", p!!.trxId)
    }

    @Test
    fun rejectsAmbiguousBothRails() {
        val body = "BKASH and NAGAD Tk 100 TrxID AABBCCDD11"
        assertNull(PaymentSmsParser.parse("unknown", body))
    }

    @Test
    fun rejectsMissingTrxLabel() {
        val body = "You got Tk 100 from bKash. Have a nice day."
        assertNull(PaymentSmsParser.parse("16247", body))
    }

    @Test
    fun rejectsPromoSms() {
        val body = "Get 50% cashback on bKash payments this weekend!"
        assertNull(PaymentSmsParser.parse("16247", body))
    }

    @Test
    fun rejectsMissingAmount() {
        val body = "bKash payment received. TrxID NOAMOUNT1X"
        assertNull(PaymentSmsParser.parse("16247", body))
    }

    @Test
    fun rejectsShortTrx() {
        val body = "You received Tk 50. TrxID SHORT"
        assertNull(PaymentSmsParser.parse("16247", body))
    }

    @Test
    fun ignoresIndiaRails() {
        val body = "Rs 100 credited UPI UTR 123456789012"
        assertNull(PaymentSmsParser.parse("AX-HDFCBK", body))
    }

    @Test
    fun ignoresRocketStyle() {
        val body = "Rocket Cash In Tk 200 TrxID ROCKETTX01"
        assertNull(PaymentSmsParser.parse("16216", body))
    }

    @Test
    fun ignoresUpayStyle() {
        val body = "Upay received Tk 50 TrxID UPAYTEST01"
        assertNull(PaymentSmsParser.parse("16268", body))
    }
}

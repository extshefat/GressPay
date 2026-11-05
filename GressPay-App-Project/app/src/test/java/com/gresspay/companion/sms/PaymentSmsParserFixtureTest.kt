package com.gresspay.companion.sms

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Loads versioned fixtures from test resources so real redacted samples can be
 * added without rewriting Kotlin assertions for every case.
 */
class PaymentSmsParserFixtureTest {
    @Test
    fun runsVersionedFixtures() {
        val stream = javaClass.classLoader!!.getResourceAsStream("sms_parser_fixtures.json")
        assertNotNull("sms_parser_fixtures.json missing from test resources", stream)
        val root = JSONObject(stream!!.bufferedReader().use { it.readText() })
        assertEquals(1, root.getInt("version"))
        val cases: JSONArray = root.getJSONArray("cases")
        assertEquals(true, cases.length() >= 8)
        for (i in 0 until cases.length()) {
            val c = cases.getJSONObject(i)
            val name = c.getString("name")
            val parsed = PaymentSmsParser.parse(c.getString("sender"), c.getString("body"))
            if (c.isNull("expect")) {
                assertNull("fixture $name should reject", parsed)
            } else {
                val expect = c.getJSONObject("expect")
                assertNotNull("fixture $name should parse", parsed)
                assertEquals("fixture $name senderKey", expect.getString("senderKey"), parsed!!.senderKey)
                assertEquals("fixture $name amount", expect.getString("amount"), parsed.amount)
                assertEquals("fixture $name trxId", expect.getString("trxId"), parsed.trxId)
            }
        }
    }
}

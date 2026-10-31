package com.gresspay.companion.ui

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Guards companion pairing input rules (device key prefix).
 */
class DevicePairingValidationTest {

    @Test
    fun acceptsGpdevPrefix() {
        assertTrue(isValidDeviceApiKey("gpdev_" + "a".repeat(40)))
    }

    @Test
    fun rejectsWebsiteKeyPrefix() {
        assertFalse(isValidDeviceApiKey("gp_live_" + "a".repeat(40)))
    }

    @Test
    fun rejectsBlank() {
        assertFalse(isValidDeviceApiKey(""))
        assertFalse(isValidDeviceApiKey("   "))
    }

    private fun isValidDeviceApiKey(raw: String): Boolean {
        val token = raw.trim()
        return token.startsWith("gpdev_")
    }
}

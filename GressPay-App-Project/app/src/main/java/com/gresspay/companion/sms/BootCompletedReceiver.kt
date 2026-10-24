package com.gresspay.companion.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.gresspay.companion.data.Prefs

class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val prefs = Prefs(context)
        if (prefs.matchingEnabled && prefs.consentAccepted && prefs.deviceToken.isNotBlank()) {
            SmsMatchService.start(context)
        }
    }
}

package com.gresspay.companion.ui

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.sync.CompanionHeartbeat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Compose-first merchant companion UI (Welcome → SMS education → Setup → Home).
 * SMS capture, heartbeat, and upload logic remain in existing services/workers.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var prefs: Prefs

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = Prefs(this)
        setContent {
            CompanionApp(prefs = prefs)
        }
    }

    override fun onResume() {
        super.onResume()
        if (prefs.deviceToken.isNotBlank() && prefs.baseUrl.isNotBlank()) {
            CoroutineScope(Dispatchers.IO).launch {
                CompanionHeartbeat.sendIfConfigured(this@MainActivity)
            }
        }
    }
}

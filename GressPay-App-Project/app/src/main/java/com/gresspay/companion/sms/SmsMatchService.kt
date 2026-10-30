package com.gresspay.companion.sms

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Telephony
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.gresspay.companion.GressPayApp
import com.gresspay.companion.R
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.sync.CompanionHeartbeat
import com.gresspay.companion.ui.MainActivity

/**
 * Foreground service while matching is opted-in.
 * Uses FOREGROUND_SERVICE_TYPE_DATA_SYNC for Android 14+ compliance.
 */
class SmsMatchService : Service() {
    private var smsReceiver: SmsBroadcastReceiver? = null
    private val heartbeatHandler = Handler(Looper.getMainLooper())
    private val heartbeatRunnable = object : Runnable {
        override fun run() {
            Thread {
                CompanionHeartbeat.sendIfConfigured(this@SmsMatchService)
            }.start()
            heartbeatHandler.postDelayed(this, HEARTBEAT_INTERVAL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = Prefs(this)
        if (!prefs.matchingEnabled || !prefs.consentAccepted) {
            stopSelf()
            return START_NOT_STICKY
        }

        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification: Notification = NotificationCompat.Builder(this, GressPayApp.CHANNEL_SMS)
            .setContentTitle(getString(R.string.notification_title))
            .setContentText(getString(R.string.notification_text))
            .setSmallIcon(R.drawable.ic_stat_gp)
            .setContentIntent(open)
            .setOngoing(true)
            .build()

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIF_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            } else {
                startForeground(NOTIF_ID, notification)
            }
        } catch (_: Exception) {
            // Android 12+ background start guard
        }

        registerSmsReceiver()
        heartbeatHandler.removeCallbacks(heartbeatRunnable)
        Thread { CompanionHeartbeat.sendIfConfigured(this) }.start()
        heartbeatHandler.postDelayed(heartbeatRunnable, HEARTBEAT_INTERVAL_MS)
        return START_STICKY
    }

    private fun registerSmsReceiver() {
        if (smsReceiver != null) return
        val receiver = SmsBroadcastReceiver()
        val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply {
            priority = 999
        }
        try {
            ContextCompat.registerReceiver(
                this,
                receiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
            )
            smsReceiver = receiver
        } catch (_: Exception) {
        }
    }

    override fun onDestroy() {
        smsReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (_: Exception) {
            }
        }
        smsReceiver = null
        heartbeatHandler.removeCallbacks(heartbeatRunnable)
        super.onDestroy()
    }

    companion object {
        private const val NOTIF_ID = 4201
        private const val HEARTBEAT_INTERVAL_MS = 180_000L

        /** @return false when the FGS could not be started (caller should surface in UI). */
        fun start(context: android.content.Context): Boolean {
            if (Build.VERSION.SDK_INT >= 33 &&
                android.content.pm.PackageManager.PERMISSION_GRANTED !=
                androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.POST_NOTIFICATIONS)
            ) {
                return false
            }
            val i = Intent(context, SmsMatchService::class.java)
            return try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(i)
                } else {
                    context.startService(i)
                }
                true
            } catch (_: Exception) {
                // Android 12+ ForegroundServiceStartNotAllowedException
                false
            }
        }

        fun stop(context: android.content.Context) {
            try {
                context.stopService(Intent(context, SmsMatchService::class.java))
            } catch (_: Exception) {
            }
        }
    }
}

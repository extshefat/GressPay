package com.gresspay.companion.ui

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.gresspay.companion.R
import com.gresspay.companion.api.ApiException
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.databinding.ActivityMainBinding
import com.gresspay.companion.sms.InboxScanner
import com.gresspay.companion.sms.SmsMatchService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.DateFormat
import java.util.Date

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs
    private val syncLog = ArrayDeque<String>(24)

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.RECEIVE_SMS] == true
        val notificationsOk = Build.VERSION.SDK_INT < 33 ||
            result[Manifest.permission.POST_NOTIFICATIONS] != false
        if (!granted || !notificationsOk) {
            prefs.matchingEnabled = false
            binding.switchMatching.isChecked = false
            setStatus("SMS or notification permission denied — matching off")
            appendLog("Permission denied — matching disabled")
            SmsMatchService.stop(this)
            refreshUi()
            return@registerForActivityResult
        }
        enableMatchingInternal()
    }

    private val inboxPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            runInboxScan()
        } else {
            Toast.makeText(this, "READ_SMS required to scan the inbox", Toast.LENGTH_LONG).show()
            appendLog("Inbox scan blocked — READ_SMS denied")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = Prefs(this)

        val defaultBase = "https://gresspay.extxcheats.com"
        binding.inputBaseUrl.setText(prefs.baseUrl.ifBlank { defaultBase })
        binding.inputApiKey.setText(prefs.apiKey)
        binding.inputDeviceToken.setText(prefs.deviceToken)
        binding.textDeviceId.text = "Device ID: ${prefs.deviceId.ifBlank { "—" }}"
        binding.switchMatching.isChecked = prefs.matchingEnabled
        refreshUi()

        binding.btnRegister.setOnClickListener { registerDevice() }
        binding.btnSaveToken.setOnClickListener { saveToken() }
        binding.btnDisconnect.setOnClickListener { disconnectDevice() }
        binding.btnPing.setOnClickListener { testPing() }
        binding.btnScanInbox.setOnClickListener { requestInboxScan() }
        binding.switchMatching.setOnCheckedChangeListener { _, checked ->
            if (checked) requestConsentAndPermissions() else disableMatching()
        }
    }

    override fun onResume() {
        super.onResume()
        refreshUi()
    }

    private fun refreshUi() {
        val parts = mutableListOf<String>()
        parts += if (prefs.baseUrl.isNotBlank()) "server ok" else "no server"
        parts += if (prefs.deviceToken.isNotBlank()) "token set" else "no token"
        if (prefs.brandId.isNotBlank()) parts += "brand ${prefs.brandId.take(8)}…"
        parts += if (prefs.consentAccepted) "consent yes" else "consent no"
        parts += if (prefs.matchingEnabled) "matching ON" else "matching OFF"
        setStatus("Status: ${parts.joinToString(" · ")}")

        val last = prefs.lastSyncAt
        binding.textLastSync.text = if (last > 0L) {
            "Last sync: ${DateFormat.getDateTimeInstance().format(Date(last))}"
        } else {
            "Last sync: —"
        }
        binding.textLastError.text = prefs.lastError.ifBlank { "" }

        binding.textTotalCaptured.text = prefs.totalSmsCaptured.toString()
        binding.textTotalMatched.text = prefs.totalPaymentsMatched.toString()

        val connected = prefs.deviceToken.isNotBlank() && prefs.baseUrl.isNotBlank()
        val matching = prefs.matchingEnabled
        binding.badgeStatus.text = when {
            matching && connected -> "MATCHING"
            connected -> "PAIRED"
            else -> "DISCONNECTED"
        }
        binding.badgeStatus.setBackgroundColor(
            ContextCompat.getColor(
                this,
                when {
                    matching && connected -> R.color.gp_emerald
                    connected -> R.color.gp_zinc_900
                    else -> R.color.gp_zinc_200
                }
            )
        )
        binding.badgeStatus.setTextColor(
            ContextCompat.getColor(
                this,
                if (matching && connected || connected) R.color.gp_white else R.color.gp_zinc_900
            )
        )

        if (::binding.isInitialized) {
            binding.textSyncLog.text = if (syncLog.isEmpty()) {
                "Sync log: idle"
            } else {
                syncLog.joinToString("\n")
            }
        }
    }

    private fun appendLog(line: String) {
        val stamp = DateFormat.getTimeInstance(DateFormat.MEDIUM).format(Date())
        syncLog.addFirst("[$stamp] $line")
        while (syncLog.size > 20) syncLog.removeLast()
        if (::binding.isInitialized) {
            binding.textSyncLog.text = syncLog.joinToString("\n")
        }
    }

    private fun disconnectDevice() {
        prefs.matchingEnabled = false
        prefs.consentAccepted = false
        SmsMatchService.stop(this)
        prefs.clearDevice()
        binding.inputDeviceToken.setText("")
        binding.textDeviceId.text = "Device ID: —"
        binding.switchMatching.isChecked = false
        Toast.makeText(this, "Matching stopped; device token cleared", Toast.LENGTH_LONG).show()
        appendLog("Device disconnected")
        refreshUi()
    }

    private fun setStatus(msg: String) {
        binding.textStatus.text = msg
    }

    private fun saveToken() {
        val base = binding.inputBaseUrl.text?.toString().orEmpty()
        if (base.isNotBlank() && !Prefs.isAllowedBaseUrl(base)) {
            Toast.makeText(this, "Insecure API URL blocked", Toast.LENGTH_LONG).show()
            return
        }
        prefs.baseUrl = base
        prefs.deviceToken = binding.inputDeviceToken.text?.toString().orEmpty()
        prefs.apiKey = binding.inputApiKey.text?.toString().orEmpty()
        Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
        appendLog("Credentials saved")
        refreshUi()
    }

    private fun testPing() {
        val base = binding.inputBaseUrl.text?.toString()?.trim().orEmpty().trimEnd('/')
        if (base.isBlank() || !Prefs.isAllowedBaseUrl(base)) {
            Toast.makeText(this, "Enter a valid HTTPS API base URL first", Toast.LENGTH_LONG).show()
            return
        }
        prefs.baseUrl = base
        binding.btnPing.isEnabled = false
        setStatus("Status: pinging…")
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    CompanionApi(base).ping(prefs.deviceToken)
                }
                binding.textPingLatency.text = if (result.ok) "${result.latencyMs} ms" else "ERR"
                if (result.ok) {
                    setStatus("Status: ping OK (${result.latencyMs} ms)")
                    appendLog("Ping OK — ${result.latencyMs} ms (${result.message})")
                } else {
                    setStatus("Status: ping failed — ${result.message}")
                    appendLog("Ping failed — ${result.message}")
                    prefs.lastError = result.message
                }
            } catch (e: Exception) {
                binding.textPingLatency.text = "ERR"
                setStatus("Status: ping failed — ${e.message}")
                appendLog("Ping error — ${e.message}")
            } finally {
                binding.btnPing.isEnabled = true
                refreshUi()
            }
        }
    }

    private fun requestInboxScan() {
        if (prefs.deviceToken.isBlank() || prefs.baseUrl.isBlank()) {
            Toast.makeText(this, "Register or save a device token first", Toast.LENGTH_LONG).show()
            return
        }
        if (!prefs.matchingEnabled || !prefs.consentAccepted) {
            Toast.makeText(this, "Enable matching before scanning the inbox", Toast.LENGTH_LONG).show()
            return
        }
        val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) {
            runInboxScan()
        } else {
            AlertDialog.Builder(this)
                .setTitle("Scan recent inbox")
                .setMessage(
                    "GressPay needs READ_SMS only for a one-time 24-hour inbox backfill. " +
                        "Full message bodies are never uploaded — only amount, TrxID, and rail."
                )
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Allow scan") { _, _ ->
                    inboxPermissionLauncher.launch(Manifest.permission.READ_SMS)
                }
                .show()
        }
    }

    private fun runInboxScan() {
        binding.btnScanInbox.isEnabled = false
        setStatus("Status: scanning inbox (24h)…")
        appendLog("Inbox scan started")
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    InboxScanner.scanAndEnqueue(this@MainActivity)
                }
                val msg =
                    "Scanned ${result.scanned}, enqueued ${result.enqueued}, skipped ${result.skipped}"
                setStatus("Status: $msg")
                appendLog(msg)
                Toast.makeText(this@MainActivity, msg, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                setStatus("Status: inbox scan failed — ${e.message}")
                appendLog("Inbox scan failed — ${e.message}")
                prefs.lastError = e.message ?: "inbox_scan_failed"
            } finally {
                binding.btnScanInbox.isEnabled = true
                refreshUi()
            }
        }
    }

    private fun registerDevice() {
        val base = binding.inputBaseUrl.text?.toString()?.trim().orEmpty().trimEnd('/')
        val key = binding.inputApiKey.text?.toString()?.trim().orEmpty()
        if (base.isBlank() || !Prefs.isAllowedBaseUrl(base)) {
            Toast.makeText(
                this,
                "API URL must be https://… (http only for localhost / 10.0.2.2)",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        if (key.isBlank() || !(key.startsWith("gp_live_") || key.startsWith("gp_test_"))) {
            Toast.makeText(this, "Enter a gp_live_ or gp_test_ API key", Toast.LENGTH_LONG).show()
            return
        }
        prefs.baseUrl = base
        prefs.apiKey = key
        setStatus("Status: registering…")
        binding.btnRegister.isEnabled = false
        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    CompanionApi(base).registerDevice(key)
                }
                prefs.deviceId = result.deviceId
                prefs.deviceToken = result.token
                if (result.brandId.isNotBlank()) {
                    prefs.brandId = result.brandId
                }
                binding.inputDeviceToken.setText(result.token)
                binding.textDeviceId.text = "Device ID: ${result.deviceId}"
                appendLog("Registered device ${result.deviceId}")
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Device registered")
                    .setMessage(
                        "Token shown once in the field below. Keep it private — it authenticates SMS uploads for your merchant brand."
                    )
                    .setPositiveButton("OK", null)
                    .show()
                refreshUi()
            } catch (e: ApiException) {
                setStatus("Status: register failed — ${e.message}")
                appendLog("Register failed — ${e.message}")
                Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                setStatus("Status: register failed — ${e.message}")
                appendLog("Register failed — ${e.message}")
                Toast.makeText(this@MainActivity, e.message ?: "Network error", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnRegister.isEnabled = true
            }
        }
    }

    private fun requestConsentAndPermissions() {
        if (prefs.deviceToken.isBlank() || prefs.baseUrl.isBlank()) {
            binding.switchMatching.isChecked = false
            Toast.makeText(this, "Register or save a device token first", Toast.LENGTH_LONG).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.consent_title))
            .setMessage(getString(R.string.consent_body))
            .setNegativeButton("Cancel") { _, _ ->
                binding.switchMatching.isChecked = false
            }
            .setPositiveButton("I agree") { _, _ ->
                prefs.consentAccepted = true
                val needed = mutableListOf(Manifest.permission.RECEIVE_SMS)
                if (Build.VERSION.SDK_INT >= 33) {
                    needed += Manifest.permission.POST_NOTIFICATIONS
                }
                val missing = needed.filter {
                    ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
                }
                if (missing.isEmpty()) {
                    enableMatchingInternal()
                } else {
                    permissionLauncher.launch(missing.toTypedArray())
                }
            }
            .show()
    }

    private fun enableMatchingInternal() {
        prefs.matchingEnabled = true
        binding.switchMatching.isChecked = true
        val started = SmsMatchService.start(this)
        if (!started) {
            prefs.lastError = "Foreground service start failed (Android 12+ restriction)"
            appendLog("FGS start failed — matching flagged but service not running")
            Toast.makeText(
                this,
                "Could not start background matching. Open the app again after unlocking the phone.",
                Toast.LENGTH_LONG
            ).show()
        } else {
            appendLog("SMS matching enabled")
            Toast.makeText(this, "SMS matching enabled", Toast.LENGTH_SHORT).show()
        }
        refreshUi()
    }

    private fun disableMatching() {
        prefs.matchingEnabled = false
        SmsMatchService.stop(this)
        appendLog("SMS matching disabled")
        refreshUi()
    }
}

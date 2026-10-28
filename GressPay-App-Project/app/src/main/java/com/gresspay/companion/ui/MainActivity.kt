package com.gresspay.companion.ui

import android.Manifest
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.work.Constraints
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import com.gresspay.companion.R
import com.gresspay.companion.api.ApiException
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.databinding.ActivityMainBinding
import com.gresspay.companion.sms.PaymentSmsParser
import com.gresspay.companion.sms.SmsMatchService
import com.gresspay.companion.sms.SmsUploadWorker
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val smsGranted = result[Manifest.permission.RECEIVE_SMS] == true
        if (!smsGranted) {
            prefs.matchingEnabled = false
            binding.switchMatching.isChecked = false
            setStatus("SMS permission denied — matching disabled")
            SmsMatchService.stop(this)
            return@registerForActivityResult
        }
        enableMatchingInternal()
    }

    private val inboxPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            scanRecentInboxInternal()
        } else {
            Toast.makeText(this, "READ_SMS permission required to scan inbox", Toast.LENGTH_SHORT).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = Prefs(this)

        binding.inputBaseUrl.setText(prefs.baseUrl)
        binding.inputApiKey.setText(prefs.apiKey)
        binding.inputDeviceToken.setText(prefs.deviceToken)
        binding.textDeviceId.text = "Device ID: ${prefs.deviceId.ifBlank { "—" }}"
        binding.switchMatching.isChecked = prefs.matchingEnabled
        refreshStatus()

        binding.btnRegister.setOnClickListener { registerDevice() }
        binding.btnPing.setOnClickListener { testPingServer() }
        binding.btnSaveToken.setOnClickListener { saveToken() }
        binding.btnScanInbox.setOnClickListener { scanRecentInbox() }
        binding.btnDisconnect.setOnClickListener { disconnectDevice() }

        binding.switchMatching.setOnCheckedChangeListener { _, checked ->
            if (checked) requestConsentAndPermissions() else disableMatching()
        }
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    private fun refreshStatus() {
        val isConfigured = prefs.baseUrl.isNotBlank() && prefs.deviceToken.isNotBlank()
        val isOnline = isConfigured && prefs.matchingEnabled

        if (isOnline) {
            binding.badgeStatus.text = "ONLINE · LISTENING"
            binding.badgeStatus.setBackgroundColor(ContextCompat.getColor(this, R.color.gp_emerald))
            binding.badgeStatus.setTextColor(ContextCompat.getColor(this, R.color.gp_white))
        } else {
            binding.badgeStatus.text = if (isConfigured) "READY · IDLE" else "DISCONNECTED"
            binding.badgeStatus.setBackgroundColor(ContextCompat.getColor(this, R.color.gp_zinc_200))
            binding.badgeStatus.setTextColor(ContextCompat.getColor(this, R.color.gp_zinc_950))
        }

        binding.textTotalCaptured.text = prefs.totalSmsCaptured.toString()
        binding.textTotalMatched.text = prefs.totalPaymentsMatched.toString()

        val parts = mutableListOf<String>()
        parts += if (prefs.baseUrl.isNotBlank()) "Server: OK" else "Server: Missing"
        parts += if (prefs.deviceToken.isNotBlank()) "Token: Stored" else "Token: Missing"
        parts += if (prefs.matchingEnabled) "Node: Active" else "Node: Inactive"
        setStatus(parts.joinToString(" • "))

        val last = prefs.lastSyncAt
        binding.textLastSync.text = if (last > 0L) {
            "Last sync: ${java.text.DateFormat.getDateTimeInstance().format(java.util.Date(last))}"
        } else {
            "Last sync: —"
        }
        binding.textLastError.text = prefs.lastError.ifBlank { "" }
    }

    private fun testPingServer() {
        val base = binding.inputBaseUrl.text?.toString()?.trim().orEmpty().trimEnd('/')
        val token = binding.inputDeviceToken.text?.toString()?.trim().orEmpty()
        if (base.isBlank()) {
            Toast.makeText(this, "Enter API Base URL first", Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnPing.isEnabled = false
        binding.textPingLatency.text = "…"

        val startTime = System.currentTimeMillis()
        lifecycleScope.launch {
            try {
                val ok = withContext(Dispatchers.IO) {
                    CompanionApi(base).ping(token)
                }
                val latency = System.currentTimeMillis() - startTime
                if (ok) {
                    binding.textPingLatency.text = "${latency}ms"
                    Toast.makeText(this@MainActivity, "Server reachable (${latency}ms)", Toast.LENGTH_SHORT).show()
                } else {
                    binding.textPingLatency.text = "ERR"
                    Toast.makeText(this@MainActivity, "Server responded with error status", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                binding.textPingLatency.text = "ERR"
                Toast.makeText(this@MainActivity, "Ping failed: ${e.message}", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnPing.isEnabled = true
            }
        }
    }

    private fun scanRecentInbox() {
        if (!prefs.matchingEnabled || prefs.deviceToken.isBlank()) {
            Toast.makeText(this, "Enable SMS matching and pair device token first", Toast.LENGTH_LONG).show()
            return
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            inboxPermissionLauncher.launch(Manifest.permission.READ_SMS)
        } else {
            scanRecentInboxInternal()
        }
    }

    private fun scanRecentInboxInternal() {
        binding.btnScanInbox.isEnabled = false
        Toast.makeText(this, "Scanning recent inbox for MFS receipts…", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch {
            var count = 0
            withContext(Dispatchers.IO) {
                val uri = Uri.parse("content://sms/inbox")
                val projection = arrayOf("address", "body", "date")
                val cursor: Cursor? = contentResolver.query(uri, projection, null, null, "date DESC LIMIT 40")
                cursor?.use { c ->
                    val addrIdx = c.getColumnIndex("address")
                    val bodyIdx = c.getColumnIndex("body")

                    while (c.moveToNext()) {
                        val from = if (addrIdx >= 0) c.getString(addrIdx).orEmpty() else ""
                        val body = if (bodyIdx >= 0) c.getString(bodyIdx).orEmpty() else ""
                        val parsed = PaymentSmsParser.parse(from, body)
                        if (parsed != null) {
                            count++
                            val idem = SmsUploadWorker.sha256("${parsed.senderKey}|${parsed.amount}|${parsed.trxId}")
                            val data = workDataOf(
                                SmsUploadWorker.KEY_SENDER to parsed.senderKey,
                                SmsUploadWorker.KEY_AMOUNT to parsed.amount,
                                SmsUploadWorker.KEY_TRX to parsed.trxId,
                                SmsUploadWorker.KEY_NUMBER to parsed.fromNumber,
                                SmsUploadWorker.KEY_IDEM to idem
                            )
                            val req = OneTimeWorkRequestBuilder<SmsUploadWorker>()
                                .setConstraints(
                                    Constraints.Builder()
                                        .setRequiredNetworkType(NetworkType.CONNECTED)
                                        .build()
                                )
                                .setInputData(data)
                                .addTag("sms_$idem")
                                .build()
                            WorkManager.getInstance(this@MainActivity).enqueue(req)
                        }
                    }
                }
            }

            binding.btnScanInbox.isEnabled = true
            Toast.makeText(
                this@MainActivity,
                if (count > 0) "Enqueued $count MFS receipt(s) for verification sync" else "No unparsed MFS receipts found in recent inbox",
                Toast.LENGTH_LONG
            ).show()
            refreshStatus()
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
        Toast.makeText(this, "Device node disconnected and credentials cleared", Toast.LENGTH_LONG).show()
        refreshStatus()
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
        Toast.makeText(this, "Device credentials saved", Toast.LENGTH_SHORT).show()
        refreshStatus()
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
            Toast.makeText(this, "Enter a valid gp_live_ or gp_test_ API key", Toast.LENGTH_LONG).show()
            return
        }
        prefs.baseUrl = base
        prefs.apiKey = key
        setStatus("Registering companion device node…")
        binding.btnRegister.isEnabled = false

        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    CompanionApi(base).registerDevice(key)
                }
                prefs.deviceId = result.deviceId
                prefs.deviceToken = result.token
                binding.inputDeviceToken.setText(result.token)
                binding.textDeviceId.text = "Device ID: ${result.deviceId}"
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Device Node Paired")
                    .setMessage(
                        "Device Token generated and stored securely. This node is now authorized to verify payment SMS receipts for your store."
                    )
                    .setPositiveButton("OK", null)
                    .show()
                refreshStatus()
            } catch (e: ApiException) {
                setStatus("Registration failed: ${e.message}")
                Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                setStatus("Registration failed: ${e.message}")
                Toast.makeText(this@MainActivity, e.message ?: "Network error", Toast.LENGTH_LONG).show()
            } finally {
                binding.btnRegister.isEnabled = true
            }
        }
    }

    private fun requestConsentAndPermissions() {
        if (prefs.deviceToken.isBlank() || prefs.baseUrl.isBlank()) {
            binding.switchMatching.isChecked = false
            Toast.makeText(this, "Save a Device Token or register device node first", Toast.LENGTH_LONG).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.consent_title))
            .setMessage(getString(R.string.consent_body))
            .setNegativeButton("Cancel") { _, _ ->
                binding.switchMatching.isChecked = false
            }
            .setPositiveButton("I Agree & Activate") { _, _ ->
                prefs.consentAccepted = true
                val needed = mutableListOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS)
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
        SmsMatchService.start(this)
        refreshStatus()
        Toast.makeText(this, "SMS automated payment verification activated", Toast.LENGTH_SHORT).show()
    }

    private fun disableMatching() {
        prefs.matchingEnabled = false
        SmsMatchService.stop(this)
        refreshStatus()
    }
}

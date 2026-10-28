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
import com.gresspay.companion.api.ApiException
import com.gresspay.companion.api.CompanionApi
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.databinding.ActivityMainBinding
import com.gresspay.companion.sms.SmsMatchService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: Prefs

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.RECEIVE_SMS] == true
        val notificationsOk = Build.VERSION.SDK_INT < 33 || result[Manifest.permission.POST_NOTIFICATIONS] == true
        if (!granted || !notificationsOk) {
            prefs.matchingEnabled = false
            binding.switchMatching.isChecked = false
            setStatus("SMS or notification permission denied — matching off")
            SmsMatchService.stop(this)
            return@registerForActivityResult
        }
        enableMatchingInternal()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        prefs = Prefs(this)

        binding.inputBaseUrl.setText(prefs.baseUrl)
        binding.inputApiKey.setText(prefs.apiKey)
        binding.inputDeviceToken.setText(prefs.deviceToken)
        binding.textDeviceId.text = "Device: ${prefs.deviceId.ifBlank { "—" }}"
        binding.switchMatching.isChecked = prefs.matchingEnabled
        refreshStatus()

        binding.btnRegister.setOnClickListener { registerDevice() }
        binding.btnSaveToken.setOnClickListener { saveToken() }
        binding.btnDisconnect.setOnClickListener { disconnectDevice() }
        binding.switchMatching.setOnCheckedChangeListener { _, checked ->
            if (checked) requestConsentAndPermissions() else disableMatching()
        }
    }

    private fun refreshStatus() {
        val parts = mutableListOf<String>()
        parts += if (prefs.baseUrl.isNotBlank()) "server ok" else "no server"
        parts += if (prefs.deviceToken.isNotBlank()) "token set" else "no token"
        parts += if (prefs.consentAccepted) "consent yes" else "consent no"
        parts += if (prefs.matchingEnabled) "matching ON" else "matching OFF"
        setStatus("Status: ${parts.joinToString(" · ")}")
        val last = prefs.lastSyncAt
        binding.textLastSync.text = if (last > 0L) {
            "Last sync: ${java.text.DateFormat.getDateTimeInstance().format(java.util.Date(last))}"
        } else {
            "Last sync: —"
        }
        binding.textLastError.text = prefs.lastError.ifBlank { "" }
    }

    private fun disconnectDevice() {
        prefs.matchingEnabled = false
        prefs.consentAccepted = false
        SmsMatchService.stop(this)
        prefs.clearDevice()
        binding.inputDeviceToken.setText("")
        binding.textDeviceId.text = "Device: —"
        binding.switchMatching.isChecked = false
        Toast.makeText(this, "Matching stopped; device token cleared", Toast.LENGTH_LONG).show()
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
        Toast.makeText(this, "Saved", Toast.LENGTH_SHORT).show()
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
                binding.inputDeviceToken.setText(result.token)
                binding.textDeviceId.text = "Device: ${result.deviceId}"
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Device registered")
                    .setMessage(
                        "Token shown once in the field below. Keep it private — it authenticates SMS uploads for your merchant brand."
                    )
                    .setPositiveButton("OK", null)
                    .show()
                refreshStatus()
            } catch (e: ApiException) {
                setStatus("Status: register failed — ${e.message}")
                Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
            } catch (e: Exception) {
                setStatus("Status: register failed — ${e.message}")
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
            .setTitle(getString(com.gresspay.companion.R.string.consent_title))
            .setMessage(getString(com.gresspay.companion.R.string.consent_body))
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
        SmsMatchService.start(this)
        refreshStatus()
        Toast.makeText(this, "SMS matching enabled", Toast.LENGTH_SHORT).show()
    }

    private fun disableMatching() {
        prefs.matchingEnabled = false
        SmsMatchService.stop(this)
        refreshStatus()
    }
}

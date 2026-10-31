package com.gresspay.companion.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gresspay.companion.data.Prefs
import kotlinx.coroutines.launch

private val GpBlue = Color(0xFF2563EB)
private val GpGreen = Color(0xFF059669)

@Composable
fun CompanionApp(prefs: Prefs) {
    val context = LocalContext.current
    val actions = remember { CompanionActions(context, prefs) }
    val nav = rememberNavController()
    val start = if (prefs.onboardingComplete && actions.readState().paired) "home" else "welcome"

    MaterialTheme {
        NavHost(navController = nav, startDestination = start) {
            composable("welcome") {
                WelcomeScreen(
                    onStart = { nav.navigate("sms") },
                    onTerms = { context.startActivity(Intent(Intent.ACTION_VIEW, CompanionActions.TERMS_URL.toUri())) },
                    onPrivacy = { context.startActivity(Intent(Intent.ACTION_VIEW, CompanionActions.PRIVACY_URL.toUri())) },
                )
            }
            composable("sms") {
                SmsEducationScreen(
                    onBack = { nav.popBackStack() },
                    onGrant = { nav.navigate("setup") },
                )
            }
            composable("setup") {
                SetupScreen(
                    actions = actions,
                    prefs = prefs,
                    onDone = {
                        actions.completeOnboarding()
                        nav.navigate("home") { popUpTo("welcome") { inclusive = true } }
                    },
                )
            }
            composable("home") {
                HomeScreen(actions = actions, onOpenSetup = { nav.navigate("setup") })
            }
        }
    }
}

@Composable
private fun WelcomeScreen(onStart: () -> Unit, onTerms: () -> Unit, onPrivacy: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
            elevation = CardDefaults.cardElevation(2.dp),
        ) {
            Box(modifier = Modifier.padding(28.dp)) {
                Text("GP", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = GpBlue)
            }
        }
        Spacer(Modifier.height(24.dp))
        Text("Welcome to GressPay Companion", fontSize = 22.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        Text(
            "Seamlessly sync payment notifications to your GressPay dashboard in real time.",
            textAlign = TextAlign.Center,
            color = Color.Gray,
            fontSize = 14.sp,
        )
        Spacer(Modifier.height(48.dp))
        Button(
            onClick = onStart,
            modifier = Modifier.fillMaxWidth().height(52.dp),
            colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
            shape = RoundedCornerShape(12.dp),
        ) {
            Text("GET STARTED", fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.height(16.dp))
        Text(
            "By continuing, you agree to our ",
            fontSize = 12.sp,
            color = Color.Gray,
        )
        Row {
            TextButton(onClick = onTerms) {
                Text("Terms", textDecoration = TextDecoration.Underline, fontSize = 12.sp)
            }
            Text(" & ", fontSize = 12.sp, color = Color.Gray)
            TextButton(onClick = onPrivacy) {
                Text("Privacy Policy", textDecoration = TextDecoration.Underline, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun SmsEducationScreen(onBack: () -> Unit, onGrant: () -> Unit) {
    var agreed by remember { mutableStateOf(false) }
    val context = LocalContext.current
    val prefs = remember { Prefs(context) }
    val actions = remember { CompanionActions(context, prefs) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val smsOk = result[Manifest.permission.RECEIVE_SMS] == true &&
            result[Manifest.permission.READ_SMS] == true
        val notifOk = Build.VERSION.SDK_INT < 33 ||
            result[Manifest.permission.POST_NOTIFICATIONS] == true
        if (smsOk && notifOk) {
            actions.acceptConsent()
            onGrant()
        }
    }

    Scaffold(topBar = {
        TextButton(onClick = onBack, modifier = Modifier.padding(8.dp)) { Text("Back") }
    }) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .padding(20.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Text("SMS Permission Required", fontSize = 24.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            Text(
                "GressPay Companion requires access to SMS to track payment transactions in real time.",
                color = Color.DarkGray,
            )
            Spacer(Modifier.height(16.dp))
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    eduRow("Targeted tracking", "Only payment alerts from bKash, Nagad, Rocket, Upay, and Cellfin.")
                    eduRow("Guaranteed privacy", "Personal chats and OTPs are ignored — only payment receipts are parsed.")
                    eduRow("Total control", "Disable matching anytime; no sync runs when matching is off.")
                    eduRow("Full transparency", "View sync activity in the app after setup.")
                    eduRow(
                        "Secure transmission",
                        "Data is sent over TLS to gresspay.extxcheats.com — never sold or shared.",
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(checked = agreed, onCheckedChange = { agreed = it })
                Text("I understand and agree to grant SMS access.", fontSize = 13.sp)
            }
            Button(
                onClick = {
                    val perms = mutableListOf(
                        Manifest.permission.RECEIVE_SMS,
                        Manifest.permission.READ_SMS,
                    )
                    if (Build.VERSION.SDK_INT >= 33) {
                        perms += Manifest.permission.POST_NOTIFICATIONS
                    }
                    permissionLauncher.launch(perms.toTypedArray())
                },
                enabled = agreed,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
            ) {
                Text("GRANT PERMISSION")
            }
            Text(
                "100% Secure & Transparent",
                color = GpGreen,
                modifier = Modifier.padding(top = 8.dp).align(Alignment.CenterHorizontally),
                fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun eduRow(title: String, body: String) {
    Column {
        Text(title, fontWeight = FontWeight.SemiBold, color = GpBlue)
        Text(body, fontSize = 13.sp, color = Color.DarkGray)
    }
}

@Composable
private fun SetupScreen(actions: CompanionActions, prefs: Prefs, onDone: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(actions.readState()) }
    var showAdvancedUrl by remember { mutableStateOf(false) }
    var baseUrl by remember { mutableStateOf(state.baseUrl.ifBlank { CompanionActions.DEFAULT_BASE }) }
    var deviceKey by remember { mutableStateOf(state.deviceToken) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { state = actions.readState() }

    fun refresh() {
        state = actions.readState()
        deviceKey = prefs.deviceToken
    }

    val smsReceive = ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) ==
        PackageManager.PERMISSION_GRANTED
    val smsRead = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS) ==
        PackageManager.PERMISSION_GRANTED
    val notif = Build.VERSION.SDK_INT < 33 ||
        ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
        PackageManager.PERMISSION_GRANTED
    val batteryOk = (context.getSystemService(android.content.Context.POWER_SERVICE) as PowerManager)
        .isIgnoringBatteryOptimizations(context.packageName)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF1F5F9))
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("Setup", fontSize = 22.sp, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
        Spacer(Modifier.height(16.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("API Configuration", fontWeight = FontWeight.Bold)
                Text(
                    "Paste only the Device API key (gpdev_…) from Dashboard → Devices. Your account and server URL are detected automatically — do not paste gp_live_… website keys.",
                    fontSize = 12.sp,
                    color = Color.Gray,
                )
                if (state.paired && state.brandName.isNotBlank()) {
                    Text(
                        "Linked to: ${state.brandName}",
                        color = GpGreen,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                } else {
                    Text(
                        if (state.paired) "Configured" else "Not configured",
                        color = if (state.paired) GpGreen else Color.Gray,
                        fontSize = 13.sp,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
                Spacer(Modifier.height(8.dp))
                if (showAdvancedUrl) {
                    OutlinedTextField(
                        value = baseUrl,
                        onValueChange = { baseUrl = it },
                        label = { Text("API base URL (site root)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(8.dp))
                } else {
                    Text(
                        "Server: ${baseUrl.ifBlank { CompanionActions.DEFAULT_BASE }}",
                        fontSize = 12.sp,
                        color = Color.DarkGray,
                    )
                    TextButton(onClick = { showAdvancedUrl = true }) {
                        Text("Change server URL", fontSize = 12.sp)
                    }
                }
                OutlinedTextField(
                    value = deviceKey,
                    onValueChange = { deviceKey = it },
                    label = { Text("Device API key") },
                    placeholder = { Text("gpdev_…") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = {
                        busy = true
                        scope.launch {
                            val reg = actions.pairDeviceCredentials(
                                deviceToken = deviceKey,
                                baseUrlOverride = if (showAdvancedUrl) baseUrl else "",
                            )
                            reg.onSuccess {
                                message = "Verified — device online"
                                refresh()
                                actions.enableMatching()
                                refresh()
                            }.onFailure { message = it.message }
                            busy = false
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
                ) {
                    Text(if (busy) "Verifying…" else "Save & verify")
                }
                message?.let { Text(it, fontSize = 12.sp, color = Color.DarkGray) }
            }
        }
        Spacer(Modifier.height(12.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("Permissions", fontWeight = FontWeight.Bold)
                permRow("Receive SMS", "Intercepts incoming payment SMS", smsReceive)
                permRow("Read SMS", "Reads existing SMS for sync", smsRead)
                permRow(
                    "Battery Optimization",
                    "Keeps app running in background",
                    batteryOk,
                    tapLabel = "Tap to Grant",
                    onTap = {
                        context.startActivity(actions.openBatterySettings())
                    },
                )
                permRow("Post Notifications", "Show incoming SMS notifications", notif)
                permRow(
                    "Auto Start",
                    "Allows app to start on boot",
                    false,
                    tapLabel = "Open",
                    onTap = { context.startActivity(actions.openAutoStartSettings()) },
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onDone,
            enabled = state.paired,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = GpGreen),
        ) {
            Text("Continue to dashboard")
        }
    }
}

@Composable
private fun permRow(
    title: String,
    subtitle: String,
    on: Boolean,
    tapLabel: String? = null,
    onTap: (() -> Unit)? = null,
) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Medium)
            Text(subtitle, fontSize = 12.sp, color = Color.Gray)
        }
        if (on) {
            Text("ON", color = GpGreen, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        } else if (onTap != null) {
            OutlinedButton(onClick = onTap) { Text(tapLabel ?: "Grant") }
        } else {
            Text("OFF", color = Color.Gray, fontSize = 12.sp)
        }
    }
}

@Composable
private fun HomeScreen(actions: CompanionActions, onOpenSetup: () -> Unit) {
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(actions.readState()) }
    LaunchedEffect(Unit) {
        state = actions.readState()
        actions.ping()
        state = actions.readState()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp),
    ) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text("GressPay Companion", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Text("MFS Verification & Automation", fontSize = 12.sp, color = Color.Gray)
            }
            Box(
                modifier = Modifier
                    .background(
                        if (state.matchingEnabled) GpGreen else Color(0xFF18181B),
                        RoundedCornerShape(6.dp),
                    )
                    .padding(horizontal = 10.dp, vertical = 4.dp),
            ) {
                Text(state.statusLabel, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Captured", state.captured.toString(), Modifier.weight(1f))
            StatCard("Matched", state.matched.toString(), Modifier.weight(1f), GpGreen)
            StatCard(
                "Latency",
                if (state.latencyMs >= 0) "${state.latencyMs} ms" else "—",
                Modifier.weight(1f),
            )
        }
        Spacer(Modifier.height(16.dp))
        Card(Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp)) {
                Text("Automation", fontWeight = FontWeight.Bold)
                Text(
                    "Payment SMS from supported MFS providers is parsed and sent securely to your GressPay platform.",
                    fontSize = 13.sp,
                    color = Color.DarkGray,
                )
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = onOpenSetup) { Text("Setup") }
                    Button(
                        onClick = {
                            scope.launch {
                                if (state.matchingEnabled) actions.disableMatching() else actions.enableMatching()
                                state = actions.readState()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
                    ) {
                        Text(if (state.matchingEnabled) "Pause matching" else "Start matching")
                    }
                }
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, valueColor: Color = Color.Black) {
    Card(modifier = modifier) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 11.sp, color = Color.Gray)
            Text(value, fontWeight = FontWeight.Bold, color = valueColor)
        }
    }
}

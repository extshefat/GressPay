package com.gresspay.companion.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.core.net.toUri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.gresspay.companion.data.Prefs
import com.gresspay.companion.data.RecentEvent
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

// GressPay Fintech Palette
private val GpBlue = Color(0xFF2563EB)
private val GpGreen = Color(0xFF059669)
private val GpRed = Color(0xFFDC2626)
private val GpAmber = Color(0xFFD97706)
private val GpDark = Color(0xFF0F172A)
private val GpGrayText = Color(0xFF64748B)
private val GpPageBg = Color(0xFFF8FAFC)
private val GpBorder = Color(0xFFE2E8F0)

// Rail Colors
private val RailBkash = Color(0xFFE2136E)
private val RailNagad = Color(0xFFF7941D)
private val RailRocket = Color(0xFF8C3494)
private val RailUpay = Color(0xFF005DAA)
private val RailCellfin = Color(0xFF007A3D)

@Composable
fun CompanionApp(prefs: Prefs) {
    val context = LocalContext.current
    val actions = remember { CompanionActions(context, prefs) }
    val nav = rememberNavController()

    // Persistent start destination: If deviceToken has already been configured or onboarding finished,
    // open directly into the Home command center. Never force-welcome an already configured app!
    val start = if (prefs.deviceToken.isNotBlank() || prefs.onboardingComplete) "home" else "welcome"

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
                    onGrant = {
                        nav.navigate("setup") {
                            popUpTo("welcome") { inclusive = false }
                        }
                    },
                )
            }
            composable("setup") {
                SetupScreen(
                    actions = actions,
                    prefs = prefs,
                    onDone = {
                        actions.completeOnboarding()
                        nav.navigate("home") {
                            popUpTo("welcome") { inclusive = true }
                        }
                    },
                    onUnpaired = {
                        nav.navigate("welcome") {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                )
            }
            composable("home") {
                HomeScreen(
                    actions = actions,
                    prefs = prefs,
                    onOpenSetup = { nav.navigate("setup") },
                )
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
            .padding(28.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier
                .size(76.dp)
                .background(Color(0xFFEFF6FF), RoundedCornerShape(20.dp))
                .border(1.dp, Color(0xFFDBEAFE), RoundedCornerShape(20.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text("GP", fontSize = 32.sp, fontWeight = FontWeight.ExtraBold, color = GpBlue)
        }
        Spacer(Modifier.height(28.dp))
        Text(
            "GressPay",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = GpDark,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(10.dp))
        Text(
            "Automated payment verification node for Bangladeshi merchants. Intercepts and matches incoming bKash, Nagad, Rocket, Upay, and Cellfin payment receipts in real time.",
            textAlign = TextAlign.Center,
            color = GpGrayText,
            fontSize = 14.sp,
            lineHeight = 20.sp,
        )
        Spacer(Modifier.height(48.dp))
        Button(
            onClick = onStart,
            modifier = Modifier
                .fillMaxWidth()
                .height(54.dp),
            colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
            shape = RoundedCornerShape(14.dp),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp),
        ) {
            Text("GET STARTED", fontWeight = FontWeight.Bold, fontSize = 15.sp, letterSpacing = 0.5.sp)
        }
        Spacer(Modifier.height(20.dp))
        Text(
            "By continuing, you agree to our",
            fontSize = 12.sp,
            color = GpGrayText,
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = onTerms, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)) {
                Text("Terms of Service", textDecoration = TextDecoration.Underline, fontSize = 12.sp, color = GpBlue)
            }
            Text("&", fontSize = 12.sp, color = GpGrayText)
            TextButton(onClick = onPrivacy, contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)) {
                Text("Privacy Policy", textDecoration = TextDecoration.Underline, fontSize = 12.sp, color = GpBlue)
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
        val smsOk = result[Manifest.permission.RECEIVE_SMS] == true ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        if (smsOk) {
            actions.acceptConsent()
            onGrant()
        }
    }

    Scaffold(
        containerColor = GpPageBg,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedButton(
                    onClick = onBack,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                ) {
                    Text("← Back", color = GpDark, fontSize = 13.sp)
                }
            }
        },
    ) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
        ) {
            Text("SMS Permission & Consent", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = GpDark)
            Spacer(Modifier.height(8.dp))
            Text(
                "GressPay acts as a non-custodial listener on this device. It needs SMS access to automatically detect customer payment receipts.",
                color = GpGrayText,
                fontSize = 13.sp,
                lineHeight = 19.sp,
            )
            Spacer(Modifier.height(18.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    eduRow("Targeted Receipt Filtering", "Only incoming credit receipts from recognized bKash, Nagad, Rocket, upay and CellFin sender names are parsed.")
                    eduRow("Privacy Guaranteed", "Personal chats, contacts, OTPs, and private messages are strictly ignored and never uploaded.")
                    eduRow("TLS Encrypted Transit", "Only sender, amount, and TrxID are sent over TLS to your authenticated GressPay gateway.")
                    eduRow("Merchant Full Control", "You can pause matching or disconnect this device anytime from this app or your dashboard.")
                }
            }
            Spacer(Modifier.height(20.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { agreed = !agreed },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Checkbox(
                    checked = agreed,
                    onCheckedChange = { agreed = it },
                    colors = CheckboxDefaults.colors(checkedColor = GpBlue),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    "I understand and agree to grant SMS access for automated payment verification.",
                    fontSize = 13.sp,
                    color = GpDark,
                    lineHeight = 18.sp,
                )
            }
            Spacer(Modifier.height(24.dp))
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
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text("GRANT PERMISSION & CONTINUE", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "🔒 Non-custodial, end-to-end TLS protected",
                color = GpGreen,
                modifier = Modifier.align(Alignment.CenterHorizontally),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun eduRow(title: String, body: String) {
    Column {
        Text(title, fontWeight = FontWeight.Bold, color = GpBlue, fontSize = 14.sp)
        Spacer(Modifier.height(2.dp))
        Text(body, fontSize = 12.sp, color = GpDark, lineHeight = 17.sp)
    }
}

@Composable
private fun SetupScreen(
    actions: CompanionActions,
    prefs: Prefs,
    onDone: () -> Unit,
    onUnpaired: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(actions.readState()) }
    var deviceKey by remember { mutableStateOf(prefs.deviceToken) }
    var busy by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf<String?>(null) }
    var isError by remember { mutableStateOf(false) }
    var showUnpairDialog by remember { mutableStateOf(false) }

    fun refresh() {
        state = actions.readState()
        if (deviceKey.isBlank()) {
            deviceKey = prefs.deviceToken
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) refresh()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) { refresh() }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { refresh() }

    if (showUnpairDialog) {
        AlertDialog(
            onDismissRequest = { showUnpairDialog = false },
            title = { Text("Unpair this device?") },
            text = { Text("This will remove the device token from this phone and stop all automated SMS matching.") },
            confirmButton = {
                Button(
                    onClick = {
                        showUnpairDialog = false
                        actions.unpairDevice()
                        onUnpaired()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GpRed),
                ) {
                    Text("Unpair Device")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showUnpairDialog = false }) {
                    Text("Cancel")
                }
            },
        )
    }

    Scaffold(
        containerColor = GpPageBg,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                OutlinedButton(
                    onClick = onDone,
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp),
                ) {
                    Text("← Back to Dashboard", color = GpDark, fontSize = 13.sp)
                }
                if (state.paired) {
                    TextButton(onClick = { showUnpairDialog = true }) {
                        Text("Disconnect", color = GpRed, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        },
    ) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 18.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Companion Setup & Key", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = GpDark)

            // Step 1: Device Key Binding Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
            ) {
                Column(Modifier.padding(18.dp)) {
                    Text("Device API Key", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = GpDark)
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "1. Open your GressPay Dashboard → Devices\n2. Click '+ Add Device' or copy an existing key\n3. Paste the Device Key (starts with gpdev_) below",
                        fontSize = 12.sp,
                        color = GpGrayText,
                        lineHeight = 17.sp,
                    )
                    Spacer(Modifier.height(14.dp))

                    if (state.paired && state.brandName.isNotBlank()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFECFDF5), RoundedCornerShape(8.dp))
                                .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        ) {
                            Text(
                                "✓ Connected to: ${state.brandName} (${state.deviceId.take(12)}...)",
                                color = GpGreen,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                    }

                    OutlinedTextField(
                        value = deviceKey,
                        onValueChange = {
                            deviceKey = it
                            message = null
                        },
                        label = { Text("Device Key (gpdev_…)") },
                        placeholder = { Text("gpdev_xxxxxxxxxxxxxxxx") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(10.dp),
                    )
                    Spacer(Modifier.height(12.dp))

                    Button(
                        onClick = {
                            busy = true
                            message = null
                            isError = false
                            scope.launch {
                                val reg = actions.pairDeviceCredentials(deviceToken = deviceKey)
                                reg.onSuccess {
                                    message = "✓ Device verified and connected successfully!"
                                    isError = false
                                    refresh()
                                    actions.enableMatching()
                                    refresh()
                                }.onFailure {
                                    message = it.message ?: "Verification failed"
                                    isError = true
                                }
                                busy = false
                            }
                        },
                        enabled = !busy && deviceKey.trim().isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
                        shape = RoundedCornerShape(10.dp),
                    ) {
                        if (busy) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                            Text("Verifying with server…")
                        } else {
                            Text("Save & Verify Connection", fontWeight = FontWeight.Bold)
                        }
                    }

                    message?.let {
                        Spacer(Modifier.height(10.dp))
                        Text(
                            it,
                            fontSize = 12.sp,
                            color = if (isError) GpRed else GpGreen,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            // Step 2: Permissions Status Card
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Required Device Permissions", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = GpDark)
                    Text(
                        "All of these permissions must be active for reliable 24/7 payment SMS reconciliation.",
                        fontSize = 12.sp,
                        color = GpGrayText,
                    )

                    PermissionStatusRow(
                        title = "Receive SMS (Live Capture)",
                        subtitle = "Intercepts incoming bKash & Nagad receipts",
                        granted = state.smsReceiveGranted,
                        onGrant = {
                            permLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                        },
                    )

                    HorizontalDivider(color = GpBorder)

                    PermissionStatusRow(
                        title = "Read SMS (Inbox Scanner)",
                        subtitle = "Backfills payments if the phone was offline",
                        granted = state.smsReadGranted,
                        onGrant = {
                            permLauncher.launch(arrayOf(Manifest.permission.READ_SMS))
                        },
                    )

                    HorizontalDivider(color = GpBorder)

                    PermissionStatusRow(
                        title = "Battery Optimization Exemption",
                        subtitle = "Prevents Android from killing the companion",
                        granted = state.batteryOptimizationIgnored,
                        grantLabel = "Allow Background",
                        onGrant = {
                            try {
                                context.startActivity(actions.openBatterySettings())
                            } catch (_: Exception) {
                                context.startActivity(actions.openAppSettings())
                            }
                        },
                    )

                    HorizontalDivider(color = GpBorder)

                    PermissionStatusRow(
                        title = "Foreground Service",
                        subtitle = "High-priority listener notification",
                        granted = state.serviceRunning,
                        grantLabel = "Start Service",
                        onGrant = {
                            actions.enableMatching()
                            refresh()
                        },
                    )
                }
            }

            // Bottom Continue Button
            Button(
                onClick = onDone,
                enabled = state.paired,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GpGreen),
                shape = RoundedCornerShape(12.dp),
            ) {
                Text("Open Companion Dashboard →", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun PermissionStatusRow(
    title: String,
    subtitle: String,
    granted: Boolean,
    grantLabel: String = "Grant",
    onGrant: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(if (granted) GpGreen else GpRed, CircleShape),
                )
                Spacer(Modifier.width(8.dp))
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = GpDark)
            }
            Spacer(Modifier.height(2.dp))
            Text(subtitle, fontSize = 11.sp, color = GpGrayText, modifier = Modifier.padding(start = 16.dp))
        }
        if (granted) {
            Box(
                modifier = Modifier
                    .background(Color(0xFFECFDF5), RoundedCornerShape(6.dp))
                    .border(1.dp, Color(0xFFA7F3D0), RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text("ACTIVE", color = GpGreen, fontWeight = FontWeight.Bold, fontSize = 11.sp)
            }
        } else if (onGrant != null) {
            Button(
                onClick = onGrant,
                colors = ButtonDefaults.buttonColors(containerColor = GpBlue),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                shape = RoundedCornerShape(8.dp),
            ) {
                Text(grantLabel, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        } else {
            Box(
                modifier = Modifier
                    .background(Color(0xFFFEF2F2), RoundedCornerShape(6.dp))
                    .border(1.dp, Color(0xFFFECACA), RoundedCornerShape(6.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Text("DENIED", color = GpRed, fontWeight = FontWeight.Bold, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun HomeScreen(
    actions: CompanionActions,
    prefs: Prefs,
    onOpenSetup: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var state by remember { mutableStateOf(actions.readState()) }
    var recentEvents by remember { mutableStateOf(prefs.getRecentEvents()) }
    var pinging by remember { mutableStateOf(false) }
    var scanning by remember { mutableStateOf(false) }
    var scanMessage by remember { mutableStateOf<String?>(null) }

    fun refresh() {
        state = actions.readState()
        recentEvents = prefs.getRecentEvents()
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                refresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(Unit) {
        refresh()
        actions.ping()
        refresh()
    }

    val permLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { refresh() }

    Scaffold(
        containerColor = GpPageBg,
        topBar = {
            // Modern Top Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .border(1.dp, GpBorder)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("GP", fontWeight = FontWeight.ExtraBold, color = GpBlue, fontSize = 14.sp)
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text("GressPay", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = GpDark)
                        Text(
                            if (state.brandName.isNotBlank()) state.brandName else "MFS Listener",
                            fontSize = 11.sp,
                            color = GpGrayText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Status Pill
                    val statusColor = when (state.statusLabel) {
                        "ACTIVE & MATCHING" -> GpGreen
                        "ACTION REQUIRED" -> GpAmber
                        "PAUSED" -> Color(0xFF475569)
                        else -> GpRed
                    }
                    Box(
                        modifier = Modifier
                            .background(statusColor.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                            .border(1.dp, statusColor.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                    ) {
                        Text(state.statusLabel, color = statusColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = onOpenSetup,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        Text("⚙ Key", fontSize = 11.sp, color = GpDark, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        },
    ) { pad ->
        LazyColumn(
            modifier = Modifier
                .padding(pad)
                .fillMaxSize(),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            // 1. Critical Alert Banner if permissions are missing!
            if (!state.smsReceiveGranted || !state.batteryOptimizationIgnored) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFECACA)),
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("⚠️", fontSize = 16.sp)
                                Spacer(Modifier.width(8.dp))
                                Text("Permissions Incomplete", fontWeight = FontWeight.Bold, color = GpRed, fontSize = 14.sp)
                            }
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Incoming payment SMS cannot be verified because Receive SMS or Background Optimization permission is missing.",
                                fontSize = 12.sp,
                                color = Color(0xFF991B1B),
                                lineHeight = 16.sp,
                            )
                            Spacer(Modifier.height(10.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                if (!state.smsReceiveGranted) {
                                    Button(
                                        onClick = {
                                            permLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = GpRed),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        shape = RoundedCornerShape(8.dp),
                                    ) {
                                        Text("Grant SMS Access", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                if (!state.batteryOptimizationIgnored) {
                                    OutlinedButton(
                                        onClick = {
                                            try {
                                                context.startActivity(actions.openBatterySettings())
                                            } catch (_: Exception) {
                                                context.startActivity(actions.openAppSettings())
                                            }
                                        },
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                    ) {
                                        Text("Allow Background", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = GpDark)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Metrics & Performance Row
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard("Captured SMS", state.captured.toString(), Modifier.weight(1f), GpDark)
                    StatCard("Matched & Credited", state.matched.toString(), Modifier.weight(1f), GpGreen)
                    StatCard(
                        "API Latency",
                        if (state.latencyMs >= 0) "${state.latencyMs} ms" else "—",
                        Modifier.weight(1f),
                        GpBlue,
                    )
                }
            }

            // 3. Engine & Permissions Live Radar Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("Engine & Permission Radar", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = GpDark)
                            Text(
                                if (state.allPermissionsGranted) "All Systems Healthy ✓" else "Attention Needed",
                                color = if (state.allPermissionsGranted) GpGreen else GpAmber,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }

                        HorizontalDivider(color = GpBorder)

                        PermissionStatusRow(
                            title = "SMS Interception (Receive SMS)",
                            subtitle = "Intercepts live bKash & Nagad payments",
                            granted = state.smsReceiveGranted,
                            onGrant = {
                                permLauncher.launch(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS))
                            },
                        )

                        PermissionStatusRow(
                            title = "SMS Inbox Reading (Read SMS)",
                            subtitle = "Allows scanning device inbox for missed SMS",
                            granted = state.smsReadGranted,
                            onGrant = {
                                permLauncher.launch(arrayOf(Manifest.permission.READ_SMS))
                            },
                        )

                        PermissionStatusRow(
                            title = "Background Battery Guard",
                            subtitle = "Keeps service running without OS sleep/kill",
                            granted = state.batteryOptimizationIgnored,
                            grantLabel = "Allow Background",
                            onGrant = {
                                try {
                                    context.startActivity(actions.openBatterySettings())
                                } catch (_: Exception) {
                                    context.startActivity(actions.openAppSettings())
                                }
                            },
                        )

                        PermissionStatusRow(
                            title = "Matching Daemon (Foreground Service)",
                            subtitle = "Active persistent listening daemon",
                            granted = state.serviceRunning,
                            grantLabel = "Restart",
                            onGrant = {
                                actions.enableMatching()
                                refresh()
                            },
                        )
                    }
                }
            }

            // 4. Primary Controls Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text("Companion Controls", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = GpDark)
                        Spacer(Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Button(
                                onClick = {
                                    scope.launch {
                                        if (state.matchingEnabled) {
                                            actions.disableMatching()
                                        } else {
                                            actions.enableMatching()
                                        }
                                        refresh()
                                    }
                                },
                                modifier = Modifier
                                    .weight(1.2f)
                                    .height(44.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = if (state.matchingEnabled) Color(0xFF334155) else GpBlue
                                ),
                                shape = RoundedCornerShape(10.dp),
                            ) {
                                Text(
                                    if (state.matchingEnabled) "⏸ Pause Matching" else "▶ Start Matching",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                )
                            }

                            OutlinedButton(
                                onClick = {
                                    scanning = true
                                    scanMessage = null
                                    scope.launch {
                                        val res = actions.scanInbox()
                                        res.onSuccess { scanMessage = it }
                                            .onFailure { scanMessage = it.message }
                                        scanning = false
                                        refresh()
                                    }
                                },
                                enabled = !scanning && state.smsReadGranted,
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                            ) {
                                if (scanning) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("📥 Scan Inbox", fontSize = 12.sp, color = GpDark)
                                }
                            }

                            OutlinedButton(
                                onClick = {
                                    pinging = true
                                    scope.launch {
                                        actions.ping()
                                        pinging = false
                                        refresh()
                                    }
                                },
                                enabled = !pinging,
                                modifier = Modifier
                                    .width(76.dp)
                                    .height(44.dp),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 4.dp),
                            ) {
                                if (pinging) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                } else {
                                    Text("⚡ Ping", fontSize = 12.sp, color = GpBlue)
                                }
                            }
                        }

                        scanMessage?.let {
                            Spacer(Modifier.height(8.dp))
                            Text(it, fontSize = 11.sp, color = GpGreen, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            // 5. Recent SMS Payment Feed Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Captured Payment SMS Feed", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = GpDark)
                    if (recentEvents.isNotEmpty()) {
                        TextButton(
                            onClick = {
                                prefs.clearRecentEvents()
                                recentEvents = emptyList()
                            },
                            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp),
                        ) {
                            Text("Clear", fontSize = 11.sp, color = GpGrayText)
                        }
                    }
                }
            }

            // 6. Recent SMS Payment Feed Items
            if (recentEvents.isEmpty()) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text("📱", fontSize = 28.sp)
                            Spacer(Modifier.height(8.dp))
                            Text("No Payment SMS Captured Yet", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = GpDark)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "Incoming payment alerts from bKash, Nagad, Rocket, Upay, or Cellfin will appear here in real time with transaction ID and settlement status.",
                                fontSize = 12.sp,
                                color = GpGrayText,
                                textAlign = TextAlign.Center,
                                lineHeight = 17.sp,
                            )
                        }
                    }
                }
            } else {
                items(recentEvents, key = { it.id }) { event ->
                    RecentEventCard(event)
                }
            }

            item {
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun RecentEventCard(event: RecentEvent) {
    val railColor = when (event.sender.lowercase()) {
        "bkash" -> RailBkash
        "nagad" -> RailNagad
        "rocket" -> RailRocket
        "upay" -> RailUpay
        "cellfin" -> RailCellfin
        else -> GpBlue
    }

    val timeFormatted = remember(event.timestamp) {
        val diffSec = (System.currentTimeMillis() - event.timestamp) / 1000
        when {
            diffSec < 60 -> "Just now"
            diffSec < 3600 -> "${diffSec / 60}m ago"
            diffSec < 86400 -> "${diffSec / 3600}h ago"
            else -> SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault()).format(Date(event.timestamp))
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(railColor.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                        .border(1.dp, railColor.copy(alpha = 0.25f), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        event.sender.take(2).uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = railColor,
                        fontSize = 12.sp,
                    )
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            event.sender.replaceFirstChar { it.uppercase() },
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = GpDark,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            "৳ ${event.amount}",
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 13.sp,
                            color = GpDark,
                        )
                    }
                    Spacer(Modifier.height(2.dp))
                    Text(
                        "TrxID: ${event.trxId}",
                        fontSize = 11.sp,
                        color = GpGrayText,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .background(
                            if (event.matched) Color(0xFFECFDF5) else Color(0xFFEFF6FF),
                            RoundedCornerShape(6.dp),
                        )
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(
                        if (event.matched) "✓ Matched" else "Captured",
                        color = if (event.matched) GpGreen else GpBlue,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(timeFormatted, fontSize = 10.sp, color = GpGrayText)
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, valueColor: Color = GpDark) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, GpBorder),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 12.dp, horizontal = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(label, fontSize = 11.sp, color = GpGrayText, fontWeight = FontWeight.Medium)
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp, color = valueColor)
        }
    }
}

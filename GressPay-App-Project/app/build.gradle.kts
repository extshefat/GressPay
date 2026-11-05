plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.gresspay.companion"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.gresspay.companion"
        minSdk = 26
        targetSdk = 35
        versionCode = 10
        versionName = "1.3.2"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "API_BASE", "\"https://gresspay.extxcheats.com\"")
    }

    signingConfigs {
        val ksPath = System.getenv("GRESSPAY_RELEASE_KEYSTORE")
        if (!ksPath.isNullOrBlank()) {
            create("release") {
                storeFile = file(ksPath)
                storePassword = System.getenv("GRESSPAY_RELEASE_STORE_PASSWORD") ?: ""
                keyAlias = System.getenv("GRESSPAY_RELEASE_KEY_ALIAS") ?: "gresspay"
                keyPassword = System.getenv("GRESSPAY_RELEASE_KEY_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        release {
            // Do NOT throw here â€” this block is evaluated during project configuration
            // and would break assembleDebug / CI when no keystore is present.
            val hasReleaseKeystore = System.getenv("GRESSPAY_RELEASE_KEYSTORE")?.isNotBlank() == true
            isMinifyEnabled = hasReleaseKeystore
            isShrinkResources = hasReleaseKeystore
            if (hasReleaseKeystore) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        // Compose-only UI — viewBinding removed with unused activity_main.xml
        compose = true
        buildConfig = true
    }
}

// Fail only release assemble/bundle/package tasks when keystore env is missing.
// Debug and unit-test tasks must configure without release secrets.
tasks.configureEach {
    val n = name
    val isReleaseShipTask =
        n == "assembleRelease" ||
            n == "bundleRelease" ||
            n == "packageRelease" ||
            n.startsWith("packageRelease") ||
            n == "signReleaseBundle" ||
            n == "makeApkFromBundleForRelease"
    if (isReleaseShipTask) {
        doFirst {
            val ks = System.getenv("GRESSPAY_RELEASE_KEYSTORE")
            if (ks.isNullOrBlank()) {
                throw GradleException(
                    "Release builds require GRESSPAY_RELEASE_KEYSTORE (and store/key passwords). " +
                        "Use assembleDebug for local/CI builds. See GressPay-App-Project/RELEASE.md."
                )
            }
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.navigation:navigation-compose:2.8.3")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    testImplementation("junit:junit:4.13.2")
}

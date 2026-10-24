plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.maya.launcher"
    // compileSdk 36-এর জন্য সাম্প্রতিক AGP দরকার — রুট build.gradle.kts দেখুন
    compileSdk = 36

    defaultConfig {
        applicationId = "com.maya.launcher"
        minSdk = 24
        targetSdk = 36  // Play-র বর্তমান নতুন-অ্যাপ বেজলাইন
        versionCode = 1
        versionName = "0.1.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
}

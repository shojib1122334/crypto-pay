# Android APK & TWA Packaging Guide for CryptoPay

CryptoPay is pre-configured with **Progressive Web App (PWA)** and **Trusted Web Activity (TWA)** compatibility. You can package it into an Android APK or Google Play Store AAB using Google's official **Bubblewrap CLI** or Android Studio.

---

## Method 1: Using Bubblewrap CLI (Fastest & Recommended)

### 1. Prerequisites
- **Node.js** v18+ installed
- **Java Development Kit (JDK 17 or 21)** installed
- **Android SDK / Command Line Tools** (Bubblewrap can install these automatically for you)

### 2. Install Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
```

### 3. Initialize the TWA Project
Run this command from your terminal:
```bash
bubblewrap init --manifest=https://your-deployed-domain.com/manifest.webmanifest
```
*(Or use the included `twa-manifest.json` file in this repository)*

Bubblewrap will read the Web App Manifest, generate the Android project structure, and create a signing keystore for you.

### 4. Build the Signed APK / AAB
```bash
bubblewrap build
```
This produces:
- `app-release-signed.apk` (For direct sideloading or sharing)
- `app-release-bundle.aab` (For Google Play Store submission)

---

## Method 2: Digital Asset Links (Full-Screen Without Browser Address Bar)

To hide the browser address bar in the Android APK, add your keystore SHA-256 fingerprint to `public/.well-known/assetlinks.json`.

1. Find your SHA-256 fingerprint:
```bash
keytool -list -v -keystore android.keystore -alias android
```
2. Update `public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.cryptopay.pos",
      "sha256_cert_fingerprints": [
        "YOUR_ACTUAL_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```
3. Deploy your website. Android will automatically verify the domain ownership and display CryptoPay in pure immersive full-screen standalone mode.

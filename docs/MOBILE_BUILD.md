# Mobile Build Workflow (`docs/MOBILE_BUILD.md`)

This document records the exact mobile development, packaging, and APK compilation workflows for the Geometry Reasoning Stand V2.

---

## 1. Architectural Readiness Status
* **Status:** **`PREPARED`** / **`BLOCKED_BY_ENVIRONMENT`** (Web-only Vite SPA).
* **Details:** GRS-2 is natively built as an optimized Single Page Application (SPA) using React 19, TypeScript, and Vite. There is no raw Capacitor, Cordova, or React Native framework checked directly into the base repository, and no Gradle projects exist. However, the codebase is fully prepared for wrapping as a hybrid mobile app.

---

## 2. Recommended Mobile Wrap (Capacitor Integration)

If you are developing or compiling a hybrid mobile APK for Android/iOS, use the following official wrapping workflow:

### Step 1: Install Capacitor CLI
```bash
npm install @capacitor/core @capacitor/cli --save-dev
```

### Step 2: Initialize Capacitor Config
```bash
npx cap init "Circle Triangle Stand" "com.example.geostand" --web-dir=dist
```

### Step 3: Add Android Platform
```bash
npm install @capacitor/android
npx cap add android
```

### Step 4: Sync Vite Production Assets
Build your optimized web files first, then synchronize them to the Android project folder:
```bash
npm run build
npx cap sync
```

### Step 5: Open in Android Studio & Compile APK
```bash
npx cap open android
```
Inside Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate your debug or release `.apk` artifact.

---

## 3. Strict Mobile Architectural Invariants

* **Isolated Mobile Layout:** The mobile wrapper must not copy or re-implement the math kernel or solver. The mobile view runs the same Vite-compiled SPA within the Capacitor WebView, ensuring perfect calculations on both web and mobile clients.
* **Storage Bridge:** On mobile devices, file-system access (saving `.json` projects or `.jsonl` findings) is automatically bridged to Web LocalStorage or native Capacitor Storage plugins.

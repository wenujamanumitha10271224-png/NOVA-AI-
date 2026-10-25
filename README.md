# 🚀 NOVA AI - Futuristic Android Assistant
**Dark Neon Cyber Assistant with Native Sinhala & English Support**

---

## 📱 How to Build Android APK & Google Play AAB Using ONLY Your Android Phone

You do **NOT** need a computer or PC to build an installable APK or a Google Play compatible AAB. Follow either of the two easy, beginner-friendly methods below using just your Android phone!

---

### Method 1: Instant Cloud Build via GitHub (Free APK & AAB)
This repository includes a pre-configured GitHub Actions workflow (`.github/workflows/android-build.yml`) that automatically compiles an Android APK and Google Play AAB in the cloud for you in ~3 minutes.

1. **Upload / Push Code to GitHub**:
   - Open [github.com](https://github.com) in your Android phone's browser (Chrome or Samsung Internet).
   - Create a new repository named `nova-ai`.
   - Upload the extracted files or push the code.
2. **Automatic Cloud Build**:
   - Tap the **Actions** tab in your GitHub repository.
   - The workflow `Build Android APK and AAB` runs automatically on GitHub's cloud servers with Android SDK and Gradle pre-installed.
3. **Download directly to your Android Phone**:
   - When the workflow completes (green checkmark), tap on the build run.
   - Scroll down to the **Artifacts** section:
     - `nova-ai-apk`: Tap to download `app-debug.apk` directly to your phone and install!
     - `nova-ai-aab`: The Google Play Android App Bundle ready to submit to the Google Play Console!

---

### Method 2: PWABuilder / Google Bubblewrap Cloud (Fastest - 2 Minutes)
No code uploading or terminal required.

1. Copy your live NOVA AI deployed URL.
2. Open [pwabuilder.com](https://www.pwabuilder.com) in Chrome on your Android phone.
3. Paste the URL and tap **Start**.
4. Tap **Package for Stores** and select **Android**.
5. Configure package name (e.g. `com.nova.ai`) and app name (`NOVA AI`).
6. Tap **Generate APK / AAB**.
7. Download the signed APK directly to your phone to install, and the `.aab` for the Google Play Store!

---

### Method 3: Instant Phone Preview (No Build Required)
1. Open the NOVA AI URL in **Google Chrome** on your Samsung / Android phone.
2. Tap the three dots (`⋮`) in the top right.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. The NOVA AI icon appears on your home screen and launches in full-screen standalone Android mode.

---

## 🛠 Framework & Technical Dependencies

- **Frontend Framework**: React 19 SPA with TypeScript & Vite
- **Styling**: Tailwind CSS v4 with custom cyber neon glow shaders
- **Backend / AI Engine**: Node.js & Express server running `@google/genai` (Gemini Flash Fast Engine)
- **Multilingual Support**: Natural Sinhala (`si-LK`) and English (`en-US`) with Web Speech API TTS
- **Multimodal AI**: Camera and photo image recognition via inline base64 vision processing
- **Creative Suite**: Song lyrics, Sinhala rap, stories, and prompt generators

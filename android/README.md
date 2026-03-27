# Android WebView Wrapper for PDF Maker

This project is a native Android wrapper for the PDF Maker PWA.

## Features
- **Splash Screen**: Modern Android 12+ Splash Screen API.
- **Loading Indicator**: Horizontal progress bar at the top of the WebView.
- **File Upload**: Full support for selecting PDF files from the device.
- **File Download**: Handles file downloads by opening them in the system viewer.
- **Back Button**: Integrated with the system back button to navigate WebView history.
- **Error Handling**: Toast notification on connection failure.

## How to Build
1. Open **Android Studio**.
2. Select **Open** and choose the `android` folder in this project.
3. Wait for Gradle to sync.
4. Connect your Android device or start an emulator.
5. Click **Run**.

## Configuration
The PWA URL is set in `MainActivity.java`:
```java
webView.loadUrl("https://ais-pre-4mqpv6a3uhrpj2nm6wrqxa-776251699325.asia-southeast1.run.app");
```

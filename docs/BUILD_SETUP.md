# Distil - Build & Auto-Update Setup Guide

Complete guide for setting up code signing, notarization, and automatic updates via GitHub releases.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Apple Developer Setup](#apple-developer-setup)
4. [GitHub Setup](#github-setup)
5. [Local Environment Configuration](#local-environment-configuration)
6. [GitHub Actions CI/CD Setup](#github-actions-cicd-setup)
7. [Testing the Setup](#testing-the-setup)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Your Distil app uses:
- **electron-builder** for packaging macOS apps (DMG + ZIP)
- **electron-updater** for automatic update checks and downloads
- **electron-builder's built-in notarization** (via `notarize: true` in package.json)
- **GitHub Releases** as the update server

The update flow:
1. GitHub Actions builds and signs the app
2. electron-builder automatically notarizes it with Apple (no custom scripts needed)
3. Publishes DMG + ZIP to GitHub Releases with `latest.yml` metadata
4. electron-updater checks `latest.yml` for new versions
5. Downloads and installs updates automatically

---

## Prerequisites

### Required Memberships

- **Apple Developer Program** ($99/year)
  - Individual or Organization account
  - Required for code signing certificates and notarization
  - Sign up: https://developer.apple.com/programs/

- **GitHub Account**
  - Repository: `martinlissmyr/distil`
  - Must have admin access to configure secrets

---

## Apple Developer Setup

### Step 1: Get Developer ID Certificate

This certificate signs your app for distribution outside the Mac App Store.

#### Option A: Via Xcode (Recommended)

1. Open **Xcode**
2. Go to **Xcode > Settings > Accounts**
3. Add your Apple Developer account if not already added
4. Select your account → Click **Manage Certificates**
5. Click **+** → Select **Developer ID Application**
6. Certificate will be created and installed in your Keychain

#### Option B: Via Apple Developer Portal

1. Go to https://developer.apple.com/account/resources/certificates
2. Click **+** to create a new certificate
3. Select **Developer ID Application**
4. Follow prompts to upload a Certificate Signing Request (CSR)
   - Create CSR via Keychain Access: **Certificate Assistant > Request a Certificate from a Certificate Authority**
5. Download and double-click to install in Keychain

#### Verify Installation

```bash
# List all Developer ID certificates
security find-identity -v -p codesigning
```

Output should include something like:
```
1) ABCD1234... "Developer ID Application: Your Name (TEAM_ID)"
```

**Important:** Note your certificate's exact name (without the hash prefix). You'll use this for `CSC_NAME`.

### Step 2: Get Team ID

```bash
# Find your Team ID
security find-identity -v -p codesigning | grep "Developer ID Application"
```

The Team ID is in parentheses: `(ABCD123456)`

Or check: https://developer.apple.com/account → Membership Details

### Step 3: Create App-Specific Password

This password is used for electron-builder's built-in notarization in both local development and CI builds.

1. Go to https://appleid.apple.com/account/manage
2. Sign in with your Apple ID
3. Under **Security** → **App-Specific Passwords** → Click **Generate Password**
4. Label it "Distil Notarization"
5. **Save the password** - you won't see it again (format: `xxxx-xxxx-xxxx-xxxx`)

**Why App-Specific Password?**
- Simple setup for both local and CI environments
- No additional file management (.p8 files)
- Works seamlessly with electron-builder's built-in notarization
- Sufficient for individual developer and automated builds

### Step 4: Understanding electron-builder's Built-in Notarization

Distil uses electron-builder's **built-in notarization** feature, which is simpler and more maintainable than custom afterSign scripts.

**How it works:**
- Set `"notarize": true` in `package.json` under the `"mac"` configuration
- electron-builder automatically detects and uses these environment variables:
  - `APPLE_ID` - Your Apple ID email
  - `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
  - `APPLE_TEAM_ID` - Your Team ID
- No custom scripts (`notarize.cjs`, `afterSign` hooks) are needed
- Notarization happens automatically during the build process

**Current configuration in package.json:**
```json
"mac": {
  "notarize": true,
  "category": "public.app-category.productivity",
  "target": ["dmg", "zip"],
  "hardenedRuntime": true,
  "gatekeeperAssess": false,
  "entitlements": "build/entitlements.mac.plist",
  "entitlementsInherit": "build/entitlements.mac.plist"
}
```

**Benefits of this approach:**
- ✅ Simpler configuration - just set `notarize: true`
- ✅ No custom scripts to maintain
- ✅ Automatic environment variable detection
- ✅ Works identically in local and CI environments
- ✅ Recommended by electron-builder documentation

---

## GitHub Setup

### Step 1: Create Personal Access Token

electron-builder needs a GitHub token to publish releases.

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Name: "Distil Release Publishing"
4. Expiration: Choose appropriate duration
5. Scopes: Check **`repo`** (full control of private repositories)
6. Click **Generate token**
7. **Copy the token** - you won't see it again

### Step 2: Configure Repository Secrets

Go to: https://github.com/martinlissmyr/distil/settings/secrets/actions

Add these secrets:

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `GH_TOKEN` | Your GitHub Personal Access Token | Publish releases |
| `APPLE_ID` | Your Apple ID email | Notarization authentication |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password | Notarization authentication |
| `APPLE_TEAM_ID` | Your Team ID (e.g., `ABCD123456`) | Notarization team identification |
| `CSC_LINK` | Base64-encoded .p12 certificate | Code signing in CI |
| `CSC_KEY_PASSWORD` | Password for .p12 file | Code signing in CI |

#### Preparing CSC_LINK (Code Signing Certificate for CI)

GitHub Actions needs your certificate in a specific format:

```bash
# Export certificate from Keychain as .p12
# 1. Open Keychain Access
# 2. Find your "Developer ID Application" certificate
# 3. Right-click → Export "Developer ID Application"
# 4. Save as .p12 with a strong password
# 5. Convert to base64:

base64 -i /path/to/certificate.p12 | pbcopy
# This copies the base64 string to clipboard - paste as CSC_LINK
```

**Security Note:** The .p12 password you set becomes `CSC_KEY_PASSWORD`.

### Step 3: Enable GitHub Releases

Ensure your repository has **Releases** enabled:
- Go to https://github.com/martinlissmyr/distil/settings
- Under **Features**, ensure **Releases** is checked

---

## Local Environment Configuration

### Step 1: Create .env.local File

Create `.env.local` in your project root (this file is gitignored):

```bash
# Code Signing
CSC_NAME=Your Name (TEAM_ID)
# ⚠️ Do NOT include "Developer ID Application:" prefix

# Notarization (App-Specific Password)
APPLE_ID=your-email@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABCD123456

# Publishing (only needed for manual publishes)
GH_TOKEN=ghp_yourGitHubTokenHere
```

**Important:** Your current environment has the "Developer ID Application:" prefix in `CSC_NAME`. Update it to just the name and team ID.

### Step 2: Update Shell Profile (Optional)

Instead of `.env.local`, you can set these in your shell profile (`~/.zshrc` or `~/.bash_profile`):

```bash
# Add to ~/.zshrc
export CSC_NAME="Your Name (TEAM_ID)"
export APPLE_ID="your-email@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCD123456"
export GH_TOKEN="ghp_yourGitHubTokenHere"
```

Then run: `source ~/.zshrc`

### Step 3: Create Entitlements File

Your `package.json` references `build/entitlements.mac.plist` but it doesn't exist. Create it:

```bash
mkdir -p build
```

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <!-- Required for Electron apps -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>

    <!-- Network access for updates and AI features -->
    <key>com.apple.security.network.client</key>
    <true/>

    <!-- Keychain access for API keys (via keytar) -->
    <key>keychain-access-groups</key>
    <array>
      <string>$(AppIdentifierPrefix)com.martinlissmyr.distil</string>
    </array>
  </dict>
</plist>
```

---

## GitHub Actions CI/CD Setup

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*' # Triggers on version tags like v0.1.0

jobs:
  build-macos:
    runs-on: macos-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Import Code Signing Certificate
        env:
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
        run: |
          # Create temporary keychain
          KEYCHAIN_PATH=$RUNNER_TEMP/build.keychain
          KEYCHAIN_PASSWORD=$(openssl rand -base64 32)

          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
          security set-keychain-settings -lut 21600 "$KEYCHAIN_PATH"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"

          # Import certificate
          echo "$CSC_LINK" | base64 --decode > certificate.p12
          security import certificate.p12 \
            -k "$KEYCHAIN_PATH" \
            -P "$CSC_KEY_PASSWORD" \
            -T /usr/bin/codesign \
            -T /usr/bin/productsign

          security set-key-partition-list \
            -S apple-tool:,apple: \
            -s -k "$KEYCHAIN_PASSWORD" \
            "$KEYCHAIN_PATH"

          security list-keychain -d user -s "$KEYCHAIN_PATH"
          rm certificate.p12

      - name: Build and publish
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: npm run publish

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: distil-macos
          path: |
            dist/*.dmg
            dist/*.zip
            dist/latest-mac.yml
```

---

## Testing the Setup

### Test 1: Local Build (Without Signing)

```bash
# Skip code signing for quick test
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
```

Should complete without errors and create `dist/mac-arm64/Distil.app`.

### Test 2: Local Build (With Signing, No Notarization)

```bash
# Ensure .env.local is configured correctly
npm run build
```

Should complete but will warn about skipped notarization if credentials are missing.

### Test 3: Full Local Build (With Notarization)

```bash
# Ensure all credentials in .env.local
npm run build
```

Should complete fully, including notarization. **This can take 5-15 minutes** for Apple to notarize.

Watch for output:
```
  • notarizing       providerShortName=YourTeamName
  • notarized
```

### Test 4: Manual Publish to GitHub

```bash
# Create a test tag
git tag v0.1.0-test
git push origin v0.1.0-test

# Publish manually
npm run publish
```

Check https://github.com/martinlissmyr/distil/releases for the new release.

### Test 5: GitHub Actions

```bash
# Create and push a version tag
git tag v0.1.1
git push origin v0.1.1
```

Monitor the workflow: https://github.com/martinlissmyr/distil/actions

Should complete and create a new release with DMG, ZIP, and `latest-mac.yml`.

### Test 6: Auto-Update Check

1. Install the app from a GitHub release
2. Update the version in `package.json` (e.g., `0.1.0` → `0.1.1`)
3. Build and publish a new release with `npm run publish`
4. Open the installed app
5. Check the console (View → Developer → Developer Tools) for update logs:
   ```
   [updates] checking
   [updates] available
   [updates] downloaded
   ```
6. Restart the app to apply the update

---

## Troubleshooting

### Issue: "Please remove prefix 'Developer ID Application:' from CSC_NAME"

**Cause:** Your environment variable includes the certificate type prefix.

**Fix:**
```bash
# Wrong
export CSC_NAME="Developer ID Application: Your Name (TEAM_ID)"

# Correct
export CSC_NAME="Your Name (TEAM_ID)"
```

### Issue: "Skipping notarization: missing credentials"

**Cause:** Environment variables not set or not loaded.

**Fix:**
- Verify `.env.local` exists and has correct values
- electron-builder automatically reads these variables from your environment
- Check variable names match exactly: `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- Ensure your shell session has loaded `.env.local` (or set variables in shell profile)

### Issue: "Certificate not found"

**Cause:** Certificate not in Keychain or name mismatch.

**Fix:**
```bash
# List all certificates
security find-identity -v -p codesigning

# Use the exact name from output (without hash)
export CSC_NAME="Your Name (TEAM_ID)"
```

### Issue: "Invalid credentials" during notarization

**Cause:** Wrong Apple ID, app-specific password, or Team ID.

**Fix:**
- Verify app-specific password at https://appleid.apple.com/account/manage
- Generate a new app-specific password if needed
- Ensure Team ID matches your Developer account
- Check that APPLE_ID matches the Apple ID associated with your Developer account

### Issue: GitHub Actions fails with "Certificate identity not found"

**Cause:** `CSC_LINK` not properly base64-encoded or `CSC_KEY_PASSWORD` incorrect.

**Fix:**
```bash
# Re-export certificate from Keychain
# Right-click certificate → Export → Save as .p12
# Use the SAME password when exporting and as CSC_KEY_PASSWORD

# Re-encode
base64 -i certificate.p12 | pbcopy
# Update CSC_LINK secret in GitHub
```

### Issue: Update check not finding new versions

**Cause:** `latest-mac.yml` not published or incorrect URL.

**Fix:**
- Verify `latest-mac.yml` exists in GitHub release
- Check console logs for errors
- Ensure `package.json` version is higher than installed version
- Verify `publish` config in `package.json` has correct owner/repo

### Issue: "Failed to load Info.plist" during notarization

**Cause:** Build incomplete or corrupted.

**Fix:**
```bash
# Clean build
rm -rf dist dist-electron
npm run build
```

---

## Alternative Approaches (Advanced)

### Using App Store Connect API Key (Not Recommended)

While it's possible to use App Store Connect API Keys for notarization, this project uses App-Specific Passwords with electron-builder's built-in notarization for simplicity. API Keys would require:
- Managing .p8 files (additional complexity)
- Base64 encoding for CI environments
- Additional environment variables (Key ID, Issuer ID)
- Custom `afterSign` hook with `@electron/notarize` library

**If you need API Key authentication:**
electron-builder supports API Key authentication through these environment variables:
- `APPLE_API_KEY` - Base64-encoded .p8 key file
- `APPLE_API_KEY_ID` - Key ID from App Store Connect
- `APPLE_API_ISSUER` - Issuer ID from App Store Connect

Set these instead of `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD`.

### Using Notarytool Profile (Local Development Only)

**Most secure for local development:**

```bash
# Store credentials in Keychain
xcrun notarytool store-credentials "DISTIL_NOTARY_PROFILE" \
  --apple-id "your-email@example.com" \
  --team-id "ABCD123456" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

Then set environment variable:
```bash
export APPLE_KEYCHAIN_PROFILE="DISTIL_NOTARY_PROFILE"
```

electron-builder will use the Keychain profile instead of explicit credentials.

**Pros:** Credentials never in files or environment variables.
**Cons:** Doesn't work in GitHub Actions (no persistent Keychain).

---

## Summary Checklist

- [ ] Apple Developer Program membership active
- [ ] Developer ID Application certificate installed
- [ ] Team ID identified
- [ ] App-Specific Password created
- [ ] GitHub Personal Access Token created
- [ ] GitHub repository secrets configured (6 secrets: GH_TOKEN, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID, CSC_LINK, CSC_KEY_PASSWORD)
- [ ] `.env.local` file created with App-Specific Password credentials
- [ ] `CSC_NAME` environment variable corrected (no prefix)
- [ ] `build/entitlements.mac.plist` created
- [ ] `.github/workflows/build.yml` created
- [ ] **`notarize: true` is set in package.json under mac configuration** (enables built-in notarization)
- [ ] Local build tested successfully
- [ ] GitHub Actions workflow tested
- [ ] Auto-update tested with real release

---

## Additional Resources

- [electron-builder Code Signing Guide](https://www.electron.build/code-signing)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-updater Documentation](https://www.electron.build/auto-update)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

**Questions or issues?** Check the troubleshooting section or open an issue in the repository.

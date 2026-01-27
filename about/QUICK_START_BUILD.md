# Quick Start: Build & Release Setup

This is a condensed version of BUILD_SETUP.md for quick reference.

## Files Created

✅ `build/entitlements.mac.plist` - Electron app entitlements
✅ `.github/workflows/build.yml` - GitHub Actions CI/CD
✅ `.env.local.example` - Template for local credentials

## Quick Setup (5 steps)

### 1. Fix Your CSC_NAME Environment Variable

Your current setting has an incorrect prefix. Update it:

```bash
# Current (WRONG)
CSC_NAME=Developer ID Application: Your Name (TEAMID)

# Correct (update in ~/.zshrc or wherever it's set)
CSC_NAME=Your Name (TEAMID)
```

Then: `source ~/.zshrc`

### 2. Create .env.local

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual credentials
```

Required values:
- `CSC_NAME` - Your certificate name (without "Developer ID Application:" prefix)
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - From https://appleid.apple.com/account/manage
- `APPLE_TEAM_ID` - Your Team ID (find with: `security find-identity -v -p codesigning`)
- `GH_TOKEN` - GitHub token with `repo` scope (from https://github.com/settings/tokens)

### 3. Configure GitHub Secrets

Go to: https://github.com/martinlissmyr/distil/settings/secrets/actions

Add these 7 secrets:

| Secret | How to Get |
|--------|------------|
| `GH_TOKEN` | GitHub Settings → Developer settings → Tokens |
| `APPLE_ID` | Your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | Apple ID → Security → App-Specific Passwords |
| `APPLE_TEAM_ID` | From `security find-identity -v -p codesigning` |
| `CSC_LINK` | Export cert as .p12, then: `base64 -i cert.p12 \| pbcopy` |
| `CSC_KEY_PASSWORD` | Password you used when exporting the .p12 |

**Optional (for API Key approach):**
| `APPLE_API_KEY` | Base64 of .p8 file |
| `APPLE_API_KEY_ID` | Key ID from App Store Connect |
| `APPLE_API_ISSUER` | Issuer ID from App Store Connect |

### 4. Test Local Build

```bash
# Quick test (no signing)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build

# Full build with signing and notarization
npm run build
```

### 5. Test GitHub Release

```bash
# Create and push a version tag
git tag v0.1.0
git push origin v0.1.0

# Watch workflow at:
# https://github.com/martinlissmyr/distil/actions
```

## Common Issues

**"Please remove prefix 'Developer ID Application:' from CSC_NAME"**
→ Update your environment variable to remove the prefix (see step 1)

**"Skipping notarization: missing credentials"**
→ Check that `.env.local` exists and has all required values

**"Certificate not found"**
→ Verify certificate name matches exactly: `security find-identity -v -p codesigning`

**GitHub Actions fails with certificate error**
→ Re-export certificate and re-encode: `base64 -i cert.p12 | pbcopy`

## Build Commands

```bash
# Development
npm run dev

# Production build (local)
npm run build

# Publish to GitHub (creates draft release)
npm run publish

# Build without signing (testing)
CSC_IDENTITY_AUTO_DISCOVERY=false npm run build
```

## What Gets Published

When you push a version tag (e.g., `v0.1.0`), GitHub Actions:

1. ✅ Builds the app
2. ✅ Signs with your Developer ID certificate
3. ✅ Notarizes with Apple
4. ✅ Creates DMG and ZIP installers
5. ✅ Publishes to GitHub Releases
6. ✅ Creates `latest-mac.yml` for auto-updates

Users install from GitHub Releases and get automatic updates via electron-updater.

## Need More Details?

See `BUILD_SETUP.md` for:
- Complete Apple Developer setup instructions
- Certificate creation process
- Detailed troubleshooting
- Alternative approaches (API keys, Keychain profiles)
- Auto-update testing procedures

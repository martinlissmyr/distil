# Build Workflow

Quick reference for building and testing Distil.

## Development

```bash
npm run dev
```

Starts Vite dev server with hot reload. Use this for all daily development work.

## Production Build Testing

```bash
npm run build
```

Creates a **signed and notarized** production build:
- Code signing: ~2-5 minutes
- Notarization: ~5-15 minutes (can be longer)
- Output: `dist/Distil-{version}-arm64.dmg` and `.zip`

**Important**: You can test the signed DMG as soon as it's created, without waiting for notarization to complete. Just press Ctrl+C once you see the DMG file appear in `dist/`.

### Why Signed Builds Are Required

Modern macOS has security restrictions that prevent unsigned Electron apps from working properly:
- Unsigned apps cannot load web content in renderer processes
- Gatekeeper blocks unsigned code from executing certain APIs
- Missing entitlements cause blank screens or crashes

**There is no practical way to test production builds without code signing on macOS.**

## Release Build

```bash
npm run publish
```

Builds, signs, notarizes, and publishes to GitHub Releases automatically.

## Build Scripts

- `npm run dev` - Development with Vite dev server (recommended)
- `npm run build` - Full production build with signing and notarization
- `npm run lint` - Run ESLint
- `npm run publish` - Build and publish to GitHub Releases

## Credentials Required

### Local Builds (`.env.local`)
```bash
# Code Signing
CSC_NAME=Your Name (TEAM_ID)

# Notarization
APPLE_ID=your-email@example.com
APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
APPLE_TEAM_ID=ABCD123456

# Publishing (optional for local builds)
GH_TOKEN=ghp_yourGitHubTokenHere
```

### CI/CD (GitHub Secrets)
- `GH_TOKEN`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`
- `CSC_LINK` (base64-encoded .p12 certificate)
- `CSC_KEY_PASSWORD`

See BUILD_SETUP.md for detailed setup instructions.

## Tips

1. **Faster testing**: Press Ctrl+C once the DMG is created (before notarization completes)
2. **First run warning**: Signed but not-yet-notarized apps will show a warning on first launch - right-click and choose "Open" to bypass
3. **Clean builds**: Run `rm -rf dist dist-electron` if you encounter build issues
4. **Line endings**: All shell scripts and config files must use LF (Unix) line endings, not CRLF (Windows)

## Troubleshooting

### "Operation not permitted" during signing
- Clean build directories: `rm -rf dist dist-electron`
- Ensure no other build processes are running

### "Entitlements parse error"
- Check `build/entitlements.mac.plist` has LF line endings, not CRLF
- Run: `file build/entitlements.mac.plist` (should not say "CRLF")

### Blank screen in production build
- This happens with unsigned builds - use signed builds for testing
- Verify the build includes `dist/assets/` folder
- Check Console.app for error logs

### Notarization stuck/slow
- Notarization can take 5-15 minutes (sometimes longer)
- You can test the signed DMG before notarization completes
- Press Ctrl+C to cancel if you just need to test locally

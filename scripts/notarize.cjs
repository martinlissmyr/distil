/* eslint-disable @typescript-eslint/no-var-requires */
require("dotenv").config({ path: ".env.local" });
const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { appOutDir, packager } = context;
  const appName = packager.appInfo.productFilename;

  // Preferred: store credentials in Keychain and reference the profile
  // xcrun notarytool store-credentials "AC_PROFILE" --apple-id ... --team-id ... --password ...
  // then use:
  // await notarize({ appBundleId: "...", appPath: "...", appleApiKey: "...", ... }) alternative
  //
  // Or authenticate via API key credentials:
  const appleApiKey = process.env.APPLE_API_KEY;        // path to .p8 OR base64 depending on how you store it
  const appleApiKeyId = process.env.APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;

  if (!appleApiKey || !appleApiKeyId || !appleApiIssuer) {
    console.warn("Skipping notarization: missing APPLE_API_KEY / APPLE_API_KEY_ID / APPLE_API_ISSUER");
    return;
  }

  await notarize({
    appBundleId: packager.appInfo.id,
    appPath: `${appOutDir}/${appName}.app`,
    appleApiKey,
    appleApiKeyId,
    appleApiIssuer
  });
};
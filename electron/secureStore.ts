// main/secureStore.ts
import keytar from 'keytar';

const SERVICE_NAME = 'distil';
const ACCOUNT_NAME = 'openai_api_key';

export async function saveApiKey(key: string) {
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, key);
}

export async function loadApiKey() {
  return keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
}

export async function clearApiKey() {
  // returns true/false depending on whether anything was deleted
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
}
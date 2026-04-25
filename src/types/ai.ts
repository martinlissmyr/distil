export const CHAT_MODEL_PROFILE_IDS = [
  'chat',
  'classifier',
  'projection',
] as const;

export type ChatModelProfileId = (typeof CHAT_MODEL_PROFILE_IDS)[number];

import type OpenAI from 'openai';
import {
  CHAT_MODEL_PROFILE_IDS,
  type ChatModelProfileId,
} from '../../src/types/ai';

export { type ChatModelProfileId };

type ChatModelProfile = {
  model: string;
  fallbackModels?: string[];
  maxCompletionTokens?: number;
  reasoningEffort?: OpenAI.Chat.ChatCompletionCreateParams['reasoning_effort'];
};

export const DEFAULT_CHAT_MODEL_PROFILE_ID: ChatModelProfileId = 'chat';

export const chatModelProfiles: Record<ChatModelProfileId, ChatModelProfile> = {
  chat: {
    model: 'gpt-5.4',
    fallbackModels: ['gpt-5.4-mini', 'gpt-5-mini'],
    reasoningEffort: 'low',
  },
  classifier: {
    model: 'gpt-5.4-nano',
    fallbackModels: ['gpt-5-nano', 'gpt-4o-mini'],
    maxCompletionTokens: 600,
    reasoningEffort: 'none',
  },
  projection: {
    model: 'gpt-5.4-mini',
    fallbackModels: ['gpt-5-mini', 'gpt-4o'],
    maxCompletionTokens: 600,
    reasoningEffort: 'low',
  },
};

export function isChatModelProfileId(value: unknown): value is ChatModelProfileId {
  return (
    typeof value === 'string' &&
    (CHAT_MODEL_PROFILE_IDS as readonly string[]).includes(value)
  );
}

export function getChatModelProfile(
  profileId: ChatModelProfileId = DEFAULT_CHAT_MODEL_PROFILE_ID
): ChatModelProfile {
  return chatModelProfiles[profileId];
}

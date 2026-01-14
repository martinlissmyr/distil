// src/types/editor.ts

import type { EditorKind } from './chat';

export type ChatConfig = {
  kind?: EditorKind;
  storyId?: string;
  storyTitle?: string;
  projectId?: string;
  projectName?: string;
  doc?: any;
  docKind?: string;
  onNavigate?: (target: string) => void;
  llmContext?: {
    kinds: string[];
    markdown: string;
  };
};

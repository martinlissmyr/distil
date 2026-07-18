// src/types/editor.ts

import type { EditorKind } from './chat';
import type { DocRefWithKind } from './docRef';
import type { DocKindId } from '../models/docs';

export type ChatConfig = {
  kind?: EditorKind;
  storyId?: string;
  storyTitle?: string;
  projectId?: string;
  projectName?: string;
  doc?: DocRefWithKind;
  docKind?: DocKindId;
  onNavigate?: (target: string) => void;
  llmContext?: {
    kinds: EditorKind[];
    markdown: string;
  };
};

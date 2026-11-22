import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { EditorContent, useEditor, type Editor, type JSONContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { PartIndexEntry } from '../../../models/story';
import { client } from '../../../api/client';
import { ChatAside } from '../../chat/ChatAside';
import { TopNavigation, type TopNavigationMenuItem } from '../../common/TopNavigation';
import { SearchPanel } from '../../editor/primitives/SearchPanel';
import { createExtensionsFromConfig, createToolbarFromConfig } from '../../editor/primitives/editorConfigFactory';
import { getDocKind, isMultiPartTextDoc } from '../../../models/docs';
import { useEditorChat } from '../../../hooks/useEditorChat';
import { useEditorSearch } from '../../../hooks/useEditorSearch';
import { useEditorSync } from '../../../hooks/useEditorSync';
import { useMarkdownExtraction } from '../../../hooks/useMarkdownExtraction';
import { useNavigation, type EditorPosition } from '../../../hooks/useNavigation';
import type { ChatConfig } from '../../../types/editor';
import environmentStyles from '../../editor/WritingEnvironment.module.scss';
import styles from './MultiChapterEditor.module.scss';

type MultiChapterEditorProps = {
  projectId: string;
  storyId: string;
  storyTitle: string;
  parts: PartIndexEntry[];
  menuItems: TopNavigationMenuItem[];
  chatConfig: ChatConfig;
  focusPartId?: string;
  onFocusPartComplete?: () => void;
};

type ChapterEditorProps = {
  partId: string;
  chapterNumber: number;
  content: JSONContent;
  onChange: (doc: JSONContent) => void;
  onFocus: (partId: string, editor: Editor, chapterNumber: number) => void;
  onReady: (partId: string, editor: Editor, chapterNumber: number) => void;
  onElementChange: (partId: string, element: HTMLDivElement | null) => void;
  onSave: (doc: JSONContent) => Promise<void>;
};

const proseConfig = getDocKind('prose');
if (!isMultiPartTextDoc(proseConfig)) {
  throw new Error('The prose document kind must use multi-part text storage.');
}

const ChapterEditor: React.FC<ChapterEditorProps> = ({
  partId,
  chapterNumber,
  content,
  onChange,
  onFocus,
  onReady,
  onElementChange,
  onSave,
}) => {
  const editor = useEditor({
    extensions: createExtensionsFromConfig(proseConfig.editorConfig),
    content,
    editorProps: {
      attributes: { spellcheck: 'true', lang: 'sv' },
    },
  });
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);

  const handleUpdate = useCallback((doc: JSONContent) => {
    setRevision((current) => current + 1);
    onChange(doc);
  }, [onChange]);

  useEditorSync(editor, content, handleUpdate);

  useEffect(() => {
    if (editor) onReady(partId, editor, chapterNumber);
  }, [chapterNumber, editor, onReady, partId]);

  useEffect(() => {
    if (revision === 0 || revision === savedRevision) return;

    const docToSave = content;
    const revisionToSave = revision;
    const timeout = window.setTimeout(() => {
      void onSave(docToSave).then(() => setSavedRevision(revisionToSave));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [content, onSave, revision, savedRevision]);

  if (!editor) return null;

  return (
    <Box ref={(element) => onElementChange(partId, element)} className={styles.chapter}>
      <Box className={styles.chapterLabel}>
        <h1 className={styles.chapterNumber}>{chapterNumber}</h1>
      </Box>
      <Box className={styles.chapterEditor} onFocus={() => onFocus(partId, editor, chapterNumber)}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export const MultiChapterEditor: React.FC<MultiChapterEditorProps> = ({
  projectId,
  storyId,
  storyTitle,
  parts,
  menuItems,
  chatConfig,
  focusPartId,
  onFocusPartComplete,
}) => {
  const [partDocs, setPartDocs] = useState<Record<string, JSONContent>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [activeChapterNumber, setActiveChapterNumber] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chapterElementsRef = useRef(new Map<string, HTMLDivElement>());
  const chapterEditorsRef = useRef(new Map<string, { editor: Editor; chapterNumber: number }>());
  const activeChapterIdRef = useRef<string | null>(null);
  const hasRestoredPositionRef = useRef(false);
  const lastSavedPositionRef = useRef<EditorPosition | null>(null);
  const orderedParts = useMemo(() => [...parts].sort((a, b) => a.order - b.order), [parts]);
  const partIds = orderedParts.map((part) => part.id).join(':');
  const positionKey = `${storyId}:prose:chapters`;
  const { saveEditorPosition, getEditorPosition } = useNavigation();

  useEffect(() => {
    let cancelled = false;

    const loadParts = async () => {
      setIsLoading(true);
      const loadedParts = await Promise.all(orderedParts.map(async (part) => {
        const response = await client.loadPartDoc(projectId, storyId, part.id);
        return response.ok ? [part.id, response.data.doc] as const : null;
      }));

      if (cancelled) return;

      setPartDocs((current) => {
        const next: Record<string, JSONContent> = {};
        for (const loaded of loadedParts) {
          if (!loaded) continue;
          const [partId, doc] = loaded;
          next[partId] = current[partId] ?? doc;
        }
        return next;
      });
      setIsLoading(false);
    };

    void loadParts();
    return () => { cancelled = true; };
  }, [orderedParts, projectId, storyId, partIds]);

  const handleChapterChange = useCallback((partId: string, doc: JSONContent) => {
    setPartDocs((current) => ({ ...current, [partId]: doc }));
  }, []);

  const saveChapter = useCallback(async (partId: string, doc: JSONContent) => {
    const response = await client.savePartDoc(projectId, storyId, partId, doc);
    if (!response.ok) console.error(`Failed to save chapter ${partId}:`, response.error);
  }, [projectId, storyId]);

  const activateChapter = useCallback((partId: string) => {
    const chapter = chapterEditorsRef.current.get(partId);
    if (!chapter || activeChapterIdRef.current === partId) return;

    activeChapterIdRef.current = partId;
    setActiveEditor(chapter.editor);
    setActiveChapterNumber(chapter.chapterNumber);
  }, []);

  const restorePosition = useCallback(() => {
    if (hasRestoredPositionRef.current || isLoading) return false;
    if (chapterEditorsRef.current.size < orderedParts.length) return false;

    const savedPosition = getEditorPosition(positionKey);
    const fallbackPartId = orderedParts[0]?.id;
    const partId = savedPosition?.partId && chapterEditorsRef.current.has(savedPosition.partId)
      ? savedPosition.partId
      : fallbackPartId;
    const chapter = partId ? chapterEditorsRef.current.get(partId) : undefined;
    const viewport = viewportRef.current;
    if (!partId || !chapter || !viewport) return false;

    hasRestoredPositionRef.current = true;
    activateChapter(partId);
    viewport.scrollTop = savedPosition?.scrollTop ?? 0;

    if (savedPosition) {
      requestAnimationFrame(() => {
        const maxPosition = chapter.editor.state.doc.content.size;
        const cursorFrom = Math.min(savedPosition.cursorFrom, maxPosition);
        const cursorTo = Math.min(savedPosition.cursorTo, maxPosition);

        if (cursorFrom === cursorTo) {
          chapter.editor.commands.focus(cursorFrom);
        } else {
          chapter.editor.chain().focus().setTextSelection({ from: cursorFrom, to: cursorTo }).run();
        }

        requestAnimationFrame(() => {
          viewport.scrollTop = savedPosition.scrollTop;
        });
      });
    }

    return true;
  }, [activateChapter, getEditorPosition, isLoading, orderedParts, positionKey]);

  const focusChapter = useCallback((partId: string) => {
    const chapter = chapterEditorsRef.current.get(partId);
    const element = chapterElementsRef.current.get(partId);
    const viewport = viewportRef.current;
    if (!chapter || !element || !viewport) return false;

    // An explicit navigation target (overview or newly created chapter) takes
    // precedence over the last saved editor position for this mount.
    hasRestoredPositionRef.current = true;
    activateChapter(partId);
    requestAnimationFrame(() => {
      chapter.editor.commands.focus('start');

      requestAnimationFrame(() => {
        const viewportRect = viewport.getBoundingClientRect();
        const cursor = chapter.editor.view.coordsAtPos(chapter.editor.state.selection.from);
        viewport.scrollTo({
          top: viewport.scrollTop + cursor.top - viewportRect.top - viewportRect.height * 0.45,
          behavior: 'smooth',
        });
      });
    });
    return true;
  }, [activateChapter]);

  const handleEditorReady = useCallback((partId: string, editor: Editor, chapterNumber: number) => {
    chapterEditorsRef.current.set(partId, { editor, chapterNumber });
    if (focusPartId === partId && focusChapter(partId)) {
      onFocusPartComplete?.();
    } else if (restorePosition()) {
      return;
    } else if (activeChapterIdRef.current === null) {
      activateChapter(partId);
    }
  }, [activateChapter, focusChapter, focusPartId, onFocusPartComplete, restorePosition]);

  const handleEditorFocus = useCallback((partId: string, editor: Editor, chapterNumber: number) => {
    chapterEditorsRef.current.set(partId, { editor, chapterNumber });
    activeChapterIdRef.current = null;
    activateChapter(partId);
  }, [activateChapter]);

  const handleChapterElementChange = useCallback((partId: string, element: HTMLDivElement | null) => {
    if (element) {
      chapterElementsRef.current.set(partId, element);
    } else {
      chapterElementsRef.current.delete(partId);
    }
  }, []);

  const updateActiveChapterFromViewport = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const viewportRect = viewport.getBoundingClientRect();
    const viewportCenter = viewportRect.top + viewportRect.height / 2;
    let closestPartId: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const part of orderedParts) {
      const element = chapterElementsRef.current.get(part.id);
      if (!element) continue;

      const rect = element.getBoundingClientRect();
      const distance = viewportCenter < rect.top
        ? rect.top - viewportCenter
        : viewportCenter > rect.bottom
          ? viewportCenter - rect.bottom
          : 0;

      if (distance < closestDistance) {
        closestPartId = part.id;
        closestDistance = distance;
      }
    }

    if (closestPartId) activateChapter(closestPartId);
  }, [activateChapter, orderedParts]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateActiveChapterFromViewport);
    return () => cancelAnimationFrame(frame);
  }, [partIds, updateActiveChapterFromViewport]);

  useEffect(() => {
    if (!focusPartId || !focusChapter(focusPartId)) return;
    onFocusPartComplete?.();
  }, [focusChapter, focusPartId, onFocusPartComplete, partIds]);

  useEffect(() => {
    if (isLoading) return;
    const frame = requestAnimationFrame(restorePosition);
    return () => cancelAnimationFrame(frame);
  }, [isLoading, partIds, restorePosition]);

  useEffect(() => {
    if (isLoading) return;

    const savePosition = () => {
      const partId = activeChapterIdRef.current;
      const chapter = partId ? chapterEditorsRef.current.get(partId) : undefined;
      const viewport = viewportRef.current;
      if (!partId || !chapter || !viewport) return;

      const nextPosition: EditorPosition = {
        partId,
        scrollTop: viewport.scrollTop,
        cursorFrom: chapter.editor.state.selection.from,
        cursorTo: chapter.editor.state.selection.to,
      };
      const lastPosition = lastSavedPositionRef.current;
      if (
        lastPosition &&
        lastPosition.partId === nextPosition.partId &&
        lastPosition.scrollTop === nextPosition.scrollTop &&
        lastPosition.cursorFrom === nextPosition.cursorFrom &&
        lastPosition.cursorTo === nextPosition.cursorTo
      ) return;

      lastSavedPositionRef.current = nextPosition;
      saveEditorPosition(positionKey, nextPosition);
    };

    const initialSave = window.setTimeout(savePosition, 200);
    const interval = window.setInterval(savePosition, 2000);
    return () => {
      window.clearTimeout(initialSave);
      window.clearInterval(interval);
      savePosition();
    };
  }, [isLoading, positionKey, saveEditorPosition]);

  const handleScroll = useCallback(({ y }: { y: number }) => {
    setIsScrolled(y > 0);
    updateActiveChapterFromViewport();
  }, [updateActiveChapterFromViewport]);

  const toolbar = createToolbarFromConfig(proseConfig.editorConfig, activeEditor);
  const { handleNavigate, handleOpenWizard } = useEditorChat({ chatConfig, editor: activeEditor ?? undefined });
  const { fullTextMarkdown, selectionMarkdown, hasSelection } = useMarkdownExtraction(activeEditor, 'prose');
  const { searchPanelOpen, setSearchPanelOpen } = useEditorSearch();

  return (
    <>
      {activeEditor && (
        <BubbleMenu
          editor={activeEditor}
          updateDelay={250}
          options={{ placement: 'top', offset: 8, flip: true }}
          className={environmentStyles.toolbarBubble}
          data-ui="bubble-menu"
        >
          {toolbar}
        </BubbleMenu>
      )}

      <Box className={environmentStyles.root}>
        <Box py={20} px={30} className={environmentStyles.topNavigation}>
          <TopNavigation title={storyTitle} menuItems={menuItems} />
        </Box>

        <Box className={environmentStyles.topOverlay} style={{ opacity: isScrolled ? 1 : 0 }} />

        {searchPanelOpen && activeEditor && (
          <SearchPanel editor={activeEditor} onClose={() => setSearchPanelOpen(false)} />
        )}

        <ScrollArea
          viewportRef={viewportRef}
          classNames={{ root: environmentStyles.scrollAreaWrapper }}
          type="hover"
          scrollbarSize={10}
          styles={{ thumb: { zIndex: 20 } }}
          onScrollPositionChange={handleScroll}
        >
          <Box className={environmentStyles.editor}>
            <Box className={styles.chapters}>
              {!isLoading && orderedParts.map((part, index) => {
                const content = partDocs[part.id];
                if (!content) return null;
                return (
                  <ChapterEditor
                    key={part.id}
                    partId={part.id}
                    chapterNumber={index + 1}
                    content={content}
                    onChange={(doc) => handleChapterChange(part.id, doc)}
                    onFocus={handleEditorFocus}
                    onReady={handleEditorReady}
                    onElementChange={handleChapterElementChange}
                    onSave={(doc) => saveChapter(part.id, doc)}
                  />
                );
              })}
            </Box>
          </Box>
        </ScrollArea>

        <Box className={environmentStyles.chatAside}>
          <ChatAside
            {...chatConfig}
            fullTextMarkdown={fullTextMarkdown || ''}
            selectionMarkdown={selectionMarkdown}
            hasSelection={hasSelection}
            title={storyTitle}
            isTextLoaded={fullTextMarkdown !== null}
            editor={activeEditor ?? undefined}
            contextChapterNumber={activeChapterNumber ?? undefined}
            onNavigate={handleNavigate}
            onOpenWizard={handleOpenWizard}
          />
        </Box>
      </Box>
    </>
  );
};

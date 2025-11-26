// src/components/editor/extensions/PersistentSelectionHighlight.ts
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export type PersistentSelectionMeta =
  | { type: 'set'; from: number; to: number }
  | { type: 'clear' };

// Shared key – we’ll import this from BaseEditor
export const persistentSelectionPluginKey = new PluginKey(
  'persistentSelectionHighlight',
);

export const PersistentSelectionHighlight = Extension.create({
  name: 'persistentSelectionHighlight',

  addOptions() {
    return {
      className: 'pm-persistent-selection',
    };
  },

  addProseMirrorPlugins() {
    const className = this.options.className as string;

    return [
      new Plugin({
        key: persistentSelectionPluginKey,
        state: {
          init: () => ({
            from: null as number | null,
            to: null as number | null,
            decorations: DecorationSet.empty,
          }),
          apply(tr, prev, _oldState, newState) {
            let { from, to } = prev;

            const meta = tr.getMeta(
              persistentSelectionPluginKey,
            ) as PersistentSelectionMeta | undefined;

            if (meta) {
              if (meta.type === 'clear') {
                from = null;
                to = null;
              } else if (meta.type === 'set') {
                from = meta.from;
                to = meta.to;
              }
            }

            if (from == null || to == null || from === to) {
              return {
                from: null,
                to: null,
                decorations: DecorationSet.empty,
              };
            }

            const deco = Decoration.inline(from, to, {
              class: className,
            });

            const decorations = DecorationSet.create(newState.doc, [deco]);

            return { from, to, decorations };
          },
        },
        props: {
          decorations(state) {
            return (this as any).getState(state).decorations;
          },
        },
      }),
    ];
  },
});
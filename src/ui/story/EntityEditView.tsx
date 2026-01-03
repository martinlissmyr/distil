// src/ui/story/EntityEditView.tsx
import { useState, useEffect, useMemo, useCallback, useRef, type RefObject } from 'react';
import { Box, Stack, ScrollArea } from '@mantine/core';
import type { DocumentTypeDef, FieldDef } from '../../models/entities/schemas/types';
import { TopNavigation } from '../common/TopNavigation';
import { Textarea } from '../common/inputs/Textarea';
import { TextInput } from '../common/inputs/TextInput';
import { Select } from '../common/inputs/Select';
import styles from './EntityIndexView.module.scss';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';
import { useLeaveGuardStore } from '../../hooks/useNavigation';
import { ChatAside } from '../chat/ChatAside';
import { useEditorChat } from '../../hooks/useEditorChat';
import { entityToMarkdown } from '../../helpers/entityMarkdownUtils';
import { buildEntityProjection } from '../../helpers/entityProjectionUtils';
import type { DocRefWithKind } from '../../types/docRef';
import { getContextDocs } from '../../chat/contextSelector';
import { useAppStore } from '../../state/useAppStore';

type EntityEditViewProps<T extends Record<string, any>> = {
  projectId: string;
  storyId: string;
  entityDoc: T | null; // null = creating new entity
  schema: DocumentTypeDef<any>;
  onBack: () => void;
  onSave: (doc: Partial<T>) => Promise<void>;
  title: string;
  /** Optional: Enable AI chat sidebar */
  withChat?: boolean;
  /** Doc reference for chat context */
  doc?: DocRefWithKind;
};

// Helper to get nested value from object using dot path
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Helper to set nested value in object using dot path
function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
  return { ...obj };
}

// Best-effort default extraction (works for z.string().default(...) and z.enum(...).default(...))
function getZodDefault(schema: any): any {
  try {
    // zod default() wraps with ZodDefault and stores defaultValue()
    if (schema?._def?.typeName === 'ZodDefault' && typeof schema._def.defaultValue === 'function') {
      return schema._def.defaultValue();
    }
    // sometimes you might have optional(default(...)) etc
    if (schema?._def?.innerType) return getZodDefault(schema._def.innerType);
  } catch {
    // ignore
  }
  return undefined;
}

export function EntityEditView<T extends Record<string, any>>({
  projectId,
  storyId,
  entityDoc,
  schema,
  onBack,
  onSave,
  title,
  withChat = false,
  doc,
}: EntityEditViewProps<T>) {
  const isNew = entityDoc === null;

  // Form state - store all field values
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Leave guard integration
  const setDirty = useLeaveGuardStore((s) => s.setDirty);
  const requestNavigate = useLeaveGuardStore((s) => s.requestNavigate);

  // Keep a stable "baseline" snapshot for dirty detection (avoids re-stringifying initial state on every render)
  const baselineRef = useRef<string>('');

  const handleBack = useCallback(() => {
    requestNavigate(onBack);
  }, [requestNavigate, onBack]);

  // Load entity data when editing / creating
  useEffect(() => {
    const initial = entityDoc ?? {};
    setFormData(initial);
    baselineRef.current = JSON.stringify(initial);
    setDirty(false);

    // Ensure we don’t leave the global guard stuck “dirty” if this component unmounts
    return () => {
      setDirty(false);
    };
  }, [entityDoc, setDirty]);

  // Dirty tracking (cheap enough for small docs)
  useEffect(() => {
    const now = JSON.stringify(formData ?? {});
    setDirty(now !== baselineRef.current);
  }, [formData, setDirty]);

  // Markdown export for chat
  const [fullTextMarkdown, setFullTextMarkdown] = useState<string>('');

  useEffect(() => {
    const markdown = entityToMarkdown(formData, schema);
    setFullTextMarkdown(markdown);
  }, [formData, schema]);

  // Initialize hook with static config (projectId/storyId only)
  const { handleOpenWizard } = useEditorChat({
    chatConfig: doc ? {
      projectId,
      storyId,
      doc,
      docKind: doc.docKind,
      llmContext: { kinds: [], markdown: '' }, // Will be overridden per-call
    } : undefined,
  });

  const handleRunWizard = async (wizardCmd: {
    wizardId: string;
    targetInputRef?: RefObject<HTMLTextAreaElement>;
    currentContent?: string;
  }) => {
    if (!doc) return;

    // Build chat context dynamically when wizard is triggered
    const writingLanguage = useAppStore.getState().writingLanguage;
    const {
      kinds: contextKinds,
      markdown: contextMarkdown,
    } = await getContextDocs(doc.docKind, 'the character as part of the world', projectId, storyId, {
      language: writingLanguage,
    });

    // Build entity projection from current form data
    const currentProjection = buildEntityProjection(formData, schema);

    // Pass dynamic context directly to handleOpenWizard
    handleOpenWizard({
      ...wizardCmd,
      currentProjection,
      chatConfig: {
        doc,
        docKind: doc.docKind,
        projectId,
        storyId,
        llmContext: {
          kinds: contextKinds || [],
          markdown: contextMarkdown || '',
        },
      },
    });
  };


  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => setNestedValue({ ...prev }, fieldName, value));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const docToSave: any = {
        ...formData,
        id: entityDoc?.id || `${schema.name}-${Date.now()}`,
        version: schema.version,
        updatedAt: new Date().toISOString(),
      };

      if (!entityDoc?.createdAt) {
        docToSave.createdAt = new Date().toISOString();
      }

      await onSave(docToSave);

      // Mark clean before leaving
      baselineRef.current = JSON.stringify(docToSave);
      setDirty(false);

      onBack();
    } catch (error) {
      console.error('Failed to save entity:', error);
    } finally {
      setSaving(false);
    }
  }, [entityDoc?.createdAt, entityDoc?.id, formData, onBack, onSave, schema.name, schema.version, setDirty]);

  // Group fields by group (or ungrouped)
  const fieldsByGroup = useMemo(() => {
    const map = new Map<string | undefined, FieldDef[]>();
    for (const field of schema.fields) {
      const groupId = field.group;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId)!.push(field);
    }
    return map;
  }, [schema.fields]);

  // Render grouped fields using SettingsGroup
  const renderGroupedFields = (groupId: string, fields: FieldDef[]) => {
    const group = schema.groups?.find((g: any) => g.id === groupId);

    const items = fields
      .map((field) => {
        const raw = getNestedValue(formData, field.name);

        if (field.type === 'text') {
          const value = raw ?? '';
          return {
            id: field.name,
            type: 'text' as const,
            label: field.label,
            value: String(value),
            placeholder: field.placeholder,
            onChange: (val: string) => handleFieldChange(field.name, val),
          } as SettingItem;
        }

        if (field.type === 'select') {
          const schemaDefault = getZodDefault(field.schema);
          const fieldValue = (raw ?? schemaDefault ?? null) as string | null;

          return {
            id: field.name,
            type: 'select' as const,
            label: field.label,
            value: fieldValue, // IMPORTANT: keep null when empty; don't coerce to ''
            placeholder: field.placeholder,
            data: field.options || [],
            onChange: (val: string | null) => handleFieldChange(field.name, val),
          } as SettingItem;
        }

        return null;
      })
      .filter((item): item is SettingItem => item !== null);

    return (
      <Stack gap={4} key={groupId}>
        {group?.label ? <SettingsGroupLabel label={group.label} description={undefined} /> : null}
        <SettingsGroup items={items} />
        {group?.description ? <SettingsGroupLabel label={undefined} description={group.description} /> : null}
      </Stack>
    );
  };

  // Render ungrouped fields (textareas + any ungrouped text/select)
  const renderUngroupedFields = (fields: FieldDef[]) => {
    return fields.map((field) => {
      const raw = getNestedValue(formData, field.name);

      if (field.type === 'textarea') {
        const value = raw ?? '';
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const ref = useRef<HTMLTextAreaElement>(null);
        const actionButtonLabel = String(value).trim() === '' ? 'Guide me' : 'Refine';
        const onWizardClick =
          field.wizard
            ? () => {
                handleRunWizard({
                  wizardId: field.wizard!,
                  targetInputRef: ref,
                  currentContent: String(value),
                });
              }
            : undefined;

        return (
          <Textarea
            key={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            value={String(value)}
            minRows={field.minRows || 4}
            onChange={(val: string) => handleFieldChange(field.name, val)}
            actionButtonText={actionButtonLabel}
            actionButtonIcon="wizard"
            onActionButtonClick={onWizardClick}
            textareaRef={ref}
          />
        );
      }

      if (field.type === 'text') {
        const value = raw ?? '';
        return (
          <TextInput
            key={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            value={String(value)}
            onChange={(val: string) => handleFieldChange(field.name, val)}
          />
        );
      }

      if (field.type === 'select') {
        const schemaDefault = getZodDefault(field.schema);
        const value = (raw ?? schemaDefault ?? null) as string | null;

        return (
          <Select
            key={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            value={value} // IMPORTANT: keep null when empty
            data={field.options || []}
            onChange={(val: string | null) => handleFieldChange(field.name, val)}
          />
        );
      }

      return null;
    });
  };

  // Check if we can save (e.g., name required)
  const nameField = useMemo(
    () => schema.fields.find((f) => f.name.endsWith('.name') || f.name === 'name'),
    [schema.fields]
  );
  const nameValue = nameField ? getNestedValue(formData, nameField.name) : '';
  const canSave = Boolean(nameValue && String(nameValue).trim().length > 0);

  return (
    <Box
      className={styles.root}
    >
      <Box className={styles.topOverlay} />
      <Box className={styles.topNavigation}>
        <TopNavigation
          title={title}
          onBack={handleBack}
          onSave={handleSave}
          canSave={canSave || saving}
          saveLabel={isNew ? 'Create' : 'Save'}
        />
      </Box>

      <Box style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        <ScrollArea
          className={styles.scrollArea}
          style={{ flex: 1, height: '100%' }}
          type="auto"
          scrollbarSize={8}
        >
          <Stack gap="lg" pt={120} pb={40} className={styles.editor}>
            {/* Render groups first */}
            {schema.groups?.map((group: any) => {
              const fields = fieldsByGroup.get(group.id) || [];
              if (fields.length === 0) return null;
              return renderGroupedFields(group.id, fields);
            })}

            {/* Render ungrouped fields */}
            {renderUngroupedFields(fieldsByGroup.get(undefined) || [])}
          </Stack>
        </ScrollArea>

        {/* Chat aside */}
        {withChat && doc && (
          <Box
            style={{
              position: 'absolute',
              top: '12px',
              bottom: '12px',
              right: 'var(--aside-offset)',
              width: 'calc(100% - var(--aside-offset) - (var(--editor-gutter) * 2 + var(--editor-width)))',
              zIndex: 20,
              display: 'flex',
            }}
          >
            <ChatAside
              doc={doc}
              title={title}
              fullTextMarkdown={fullTextMarkdown}
              isTextLoaded={true}
              onOpenWizard={handleOpenWizard}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
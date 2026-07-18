// src/ui/story/EntityEditView.tsx
import { useState, useEffect, useMemo, useCallback, useRef, type RefObject } from 'react';
import { Box, Stack, ScrollArea } from '@mantine/core';
import type { DocumentTypeDef, FieldDef } from '../../../models/entities/schemas/types';
import { TopNavigation } from '../../common/TopNavigation';
import { Textarea } from '../../common/inputs/Textarea';
import { TextInput } from '../../common/inputs/TextInput';
import { Select } from '../../common/inputs/Select';
import styles from './EntityIndexView.module.scss';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../../common/SettingsGroup';
import { useLeaveGuardStore } from '../../../hooks/useNavigation';
import { ChatAside } from '../../chat/ChatAside';
import { useEditorChat } from '../../../hooks/useEditorChat';
import { entityToMarkdown } from '../../../helpers/entityMarkdownUtils';
import { buildEntityProjection } from '../../../helpers/entityProjectionUtils';
import type { DocRefWithKind } from '../../../types/docRef';
import { getContextDocs } from '../../../chat/contextSelector';
import { useAppStore } from '../../../state/useAppStore';
import { getZodDefault, getRequiredFields } from '../../../helpers/zodHelpers';
import type { CharacterDoc } from '../../../models/entities/schemas/character';
import type { LocationDoc } from '../../../models/entities/schemas/location';
import type { GroupDef } from '../../../models/entities/schemas/types';

type EntityFieldValue = string | number | boolean | null | undefined;
type EntityFormData = Record<string, EntityFieldValue>;
type EntityDoc = CharacterDoc | LocationDoc;
type EntitySchema = DocumentTypeDef<readonly GroupDef[] | undefined>;

type EntityEditViewProps = {
  projectId: string;
  storyId: string;
  entityDoc: EntityDoc | null; // null = creating new entity
  schema: EntitySchema;
  onBack: () => void;
  onSave: (doc: EntityDoc) => Promise<void>;
  title: string;
  /** Optional: Enable AI chat sidebar */
  withChat?: boolean;
  /** Doc reference for chat context */
  doc?: DocRefWithKind;
};

export function EntityEditView({
  projectId,
  storyId,
  entityDoc,
  schema,
  onBack,
  onSave,
  title,
  withChat = false,
  doc,
}: EntityEditViewProps) {
  const isNew = entityDoc === null;
  const initialFormData = useMemo<EntityFormData>(
    () => (entityDoc ?? {}) as EntityFormData,
    [entityDoc]
  );

  // Form state - store all field values
  const [formData, setFormData] = useState<EntityFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  // Leave guard integration
  const setDirty = useLeaveGuardStore((s) => s.setDirty);
  const requestNavigate = useLeaveGuardStore((s) => s.requestNavigate);

  // Keep a stable "baseline" snapshot for dirty detection (avoids re-stringifying initial state on every render)
  const baselineRef = useRef<string>(JSON.stringify(initialFormData));

  const handleBack = useCallback(() => {
    requestNavigate(onBack);
  }, [requestNavigate, onBack]);

  // Ensure we don’t leave the global guard stuck “dirty” if this component unmounts
  useEffect(() => {
    setDirty(false);
    return () => {
      setDirty(false);
    };
  }, [setDirty]);

  // Dirty tracking (cheap enough for small docs)
  useEffect(() => {
    const now = JSON.stringify(formData ?? {});
    setDirty(now !== baselineRef.current);
  }, [formData, setDirty]);

  const fullTextMarkdown = useMemo(() => entityToMarkdown(formData, schema), [formData, schema]);

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
    targetInputRef?: RefObject<HTMLTextAreaElement | null>;
    currentContent?: string;
  }) => {
    if (!doc) return;

    // Build chat context dynamically when wizard is triggered
    const writingLanguage = useAppStore.getState().writingLanguage;
    const {
      kinds: contextKinds,
      markdown: contextMarkdown,
    } = await getContextDocs(doc.docKind, '', projectId, storyId, {
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

  const handleFieldChange = useCallback((fieldName: string, value: EntityFieldValue) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docToSave = {
        ...formData,
        id: entityDoc?.id || `${schema.name}-${Date.now()}`,
        version: schema.version,
        updatedAt: new Date().toISOString(),
      } as EntityDoc;

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
  };

  // Check if we can save (all required fields must have values)
  const canSave = useMemo(() => {
    const requiredFields = getRequiredFields(schema);
    return requiredFields.every((field) => {
      const value = formData[field.name];
      if (value === null || value === undefined) return false;
      if (typeof value === 'string' && value.trim().length === 0) return false;
      return true;
    });
  }, [formData, schema]);

  // Create refs for all textarea fields upfront (must be at top level, not inside render functions)
  const textareaRefs = useMemo(() => {
    const refs = new Map<string, RefObject<HTMLTextAreaElement | null>>();
    for (const field of schema.fields) {
      if (field.type === 'textarea') {
        refs.set(field.name, { current: null });
      }
    }
    return refs;
  }, [schema.fields]);

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
    const group = schema.groups?.find((g) => g.id === groupId);

    const items = fields
      .map((field) => {
        const raw = formData[field.name];

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
      const raw = formData[field.name];

      if (field.type === 'textarea') {
        const value = raw ?? '';
        const ref = textareaRefs.get(field.name)!;
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
            value={value || ''} // IMPORTANT: keep null when empty
            data={field.options || []}
            onChange={(val: string | null) => handleFieldChange(field.name, val)}
          />
        );
      }

      return null;
    });
  };

  return (
    <Box
      className={styles.root}
    >
      <Box className={styles.topOverlay} />
      <Box className={styles.topNavigation}>
        <TopNavigation
          title={title}
          onBack={handleBack}
          buttons={[
            {
              label: isNew ? 'Create' : 'Save',
              onClick: handleSave,
              enabled: canSave && !saving,
            }
          ]}
        />
      </Box>

      <Box className={styles.contentWrapper}>
        <ScrollArea
          className={styles.scrollAreaWrapper}
          type="hover"
          scrollbarSize={10}
          styles={{
            thumb: {
              zIndex: 20, // Above topOverlay
            }
          }}
        >
          <Stack gap="lg" className={`${styles.editor} ${styles.editorContent}`}>
            {/* Render groups first */}
            {schema.groups?.map((group) => {
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
          <Box className={styles.chatAsideWrapper}>
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

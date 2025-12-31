// src/components/story/EntityEditView.tsx
import { useState, useEffect } from 'react';
import { Box, Stack, Button, ScrollArea } from '@mantine/core';
import type { DocumentTypeDef, FieldDef } from '../../models/entities/schemas/types';
import { TopNavigation } from '../common/TopNavigation';
import { Textarea } from '../common/inputs/Textarea';
import { TextInput } from '../common/inputs/TextInput';
import { Select } from '../common/inputs/Select';
import styles from './EntityIndexView.module.scss';
import { SettingsGroup, SettingsGroupLabel, type SettingItem } from '../common/SettingsGroup';

type EntityEditViewProps<T extends Record<string, any>> = {
  projectId: string;
  storyId: string;
  entityDoc: T | null; // null = creating new entity
  schema: DocumentTypeDef<any>;
  onBack: () => void;
  onSave: (doc: Partial<T>) => Promise<void>;
  title: string;
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

export function EntityEditView<T extends Record<string, any>>({
  entityDoc,
  schema,
  onBack,
  onSave,
  title,
}: EntityEditViewProps<T>) {
  const isNew = entityDoc === null;

  // Form state - store all field values
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Load entity data when editing
  useEffect(() => {
    if (entityDoc) {
      setFormData(entityDoc);
    } else {
      // Reset form for new entity
      setFormData({});
    }
  }, [entityDoc]);

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => setNestedValue({ ...prev }, fieldName, value));
  };

  const handleSave = async () => {
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
      onBack();
    } catch (error) {
      console.error('Failed to save entity:', error);
    } finally {
      setSaving(false);
    }
  };

  // Group fields by group (or ungrouped)
  const fieldsByGroup = new Map<string | undefined, FieldDef[]>();
  for (const field of schema.fields) {
    const groupId = field.group;
    if (!fieldsByGroup.has(groupId)) {
      fieldsByGroup.set(groupId, []);
    }
    fieldsByGroup.get(groupId)!.push(field);
  }

  // Render grouped fields using SettingsGroup
  const renderGroupedFields = (groupId: string, fields: FieldDef[]) => {
    const group = schema.groups?.find((g: any) => g.id === groupId);

    const items = fields.map(field => {
      const value = getNestedValue(formData, field.name) ?? '';

      if (field.type === 'text') {
        return {
          id: field.name,
          type: 'text' as const,
          label: field.label,
          value: String(value),
          placeholder: field.placeholder,
          onChange: (val: string) => handleFieldChange(field.name, val),
        } as SettingItem;
      } else if (field.type === 'select') {
        // Get the default from schema if value is undefined
        const schemaDefault = field.schema._def.defaultValue ?? field.schema._def.innerType?._def.defaultValue;
        const fieldValue = getNestedValue(formData, field.name) ?? schemaDefault ?? '';

        return {
          id: field.name,
          type: 'select' as const,
          label: field.label,
          value: String(fieldValue),
          placeholder: field.placeholder,
          data: field.options || [],
          onChange: (val: string | null) => handleFieldChange(field.name, val),
        } as SettingItem;
      }

      return null;
    }).filter((item): item is SettingItem => item !== null);

    return (
      <Stack gap={4} key={groupId}>
        {group?.label && <SettingsGroupLabel label={group.label} description={undefined} />}
        <SettingsGroup items={items} />
        {group?.description && <SettingsGroupLabel label={undefined} description={group.description} />}
      </Stack>
    );
  };

  // Render ungrouped fields (textareas)
  const renderUngroupedFields = (fields: FieldDef[]) => {
    return fields.map(field => {
      const value = getNestedValue(formData, field.name) ?? '';

      if (field.type === 'textarea') {
        return (
          <Textarea
            key={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            value={String(value)}
            autosize
            minRows={field.minRows || 4}
            onChange={(val: string) => handleFieldChange(field.name, val)}
          />
        );
      }

      // Non-textarea ungrouped fields (text, select)
      if (field.type === 'text') {
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
        // Get the default from schema if value is undefined
        const schemaDefault = field.schema._def.defaultValue ?? field.schema._def.innerType?._def.defaultValue;
        const fieldValue = getNestedValue(formData, field.name) ?? schemaDefault ?? '';

        return (
          <Select
            key={field.name}
            label={field.label}
            description={field.description}
            placeholder={field.placeholder}
            value={String(fieldValue)}
            data={field.options || []}
            onChange={(val: string | null) => handleFieldChange(field.name, val)}
          />
        );
      }

      return null;
    });
  };

  // Check if we can save (e.g., name required)
  const nameField = schema.fields.find(f => f.name.endsWith('.name') || f.name === 'name');
  const nameValue = nameField ? getNestedValue(formData, nameField.name) : '';
  const canSave = nameValue && String(nameValue).trim().length > 0;

  return (
    <Box className={styles.root}>
      <Box className={styles.topOverlay} />
      <Box className={styles.topNavigation}>
        <TopNavigation title={title} onBack={onBack} />
      </Box>
      <ScrollArea
        className={styles.scrollArea}
        style={{ height: '100%' }}
        type="auto"
        scrollbarSize={8}
      >
        <Stack gap="lg" pt={120} pb={40}>
          <Box w={600} ml="auto" mr="auto">
            <Stack gap="xl">
              {/* Render groups first */}
              {schema.groups?.map((group: any) => {
                const fields = fieldsByGroup.get(group.id) || [];
                if (fields.length === 0) return null;
                return renderGroupedFields(group.id, fields);
              })}

              {/* Render ungrouped fields */}
              {renderUngroupedFields(fieldsByGroup.get(undefined) || [])}

              {/* Save button */}
              <Button onClick={handleSave} disabled={!canSave || saving} loading={saving}>
                {isNew ? `Create ${schema.title}` : 'Save Changes'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </ScrollArea>
    </Box>
  );
}

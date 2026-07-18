// src/ui/common/EntityEditModal.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Stack, Box } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import { TopNavigation } from '../common/TopNavigation';
import { SettingsGroup, type SettingItem } from '../common/SettingsGroup';
import { generateProjectName, generateStoryTitle } from '../../helpers/nameGenerator';

type EntityType = 'project' | 'story';

type EntityEditModalProps = {
  opened: boolean;
  title: string; // "Edit project", "Edit story"
  entityType: EntityType;

  fieldLabel?: string; // defaults to "Name"
  deleteLabel?: string; // "project", "story"

  initialName: string;

  onClose: () => void;
  onSave: (newName: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
};

export const EntityEditModal: React.FC<EntityEditModalProps> = ({
  opened,
  title,
  entityType,
  fieldLabel = 'Name',
  deleteLabel = 'item',
  initialName,
  onClose,
  onSave,
  onDelete,
}) => {
  /** What the user is typing (can be empty, can include whitespace) */
  const sessionKey = `${opened}:${initialName}:${entityType}`;
  const [draftState, setDraftState] = useState<{ sessionKey: string; draftName: string }>({
    sessionKey,
    draftName: initialName,
  });
  const draftName = draftState.sessionKey === sessionKey ? draftState.draftName : initialName;

  /** Snapshot of the initial value for this open session */
  const initialRef = useRef<string>(initialName);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const genFallback = useCallback(() => {
    return entityType === 'project' ? generateProjectName() : generateStoryTitle();
  }, [entityType]);

  // Reset local state on open/entity change
  useEffect(() => {
    if (!opened) return;

    const timeoutId = window.setTimeout(() => {
      setDraftState({ sessionKey, draftName: initialName });
      initialRef.current = initialName;
      setDeleteConfirm(false);
      setIsClosing(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [opened, initialName, sessionKey]);

  const handleDeleteClick = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }

    // If you delete, you probably want to close the modal too,
    // but keep behavior consistent with your current flow.
    await onDelete();
  };

  const handleClose = useCallback(async () => {
    if (isClosing) return;

    const trimmed = draftName.trim();

    // Choose final persisted value
    const finalValue = trimmed.length === 0 ? genFallback() : trimmed;

    // Only persist if it actually changed compared to what we opened with
    if (finalValue !== initialRef.current) {
      try {
        setIsClosing(true);
        await onSave(finalValue);
      } finally {
        setIsClosing(false);
      }
    }

    onClose();
  }, [draftName, genFallback, isClosing, onClose, onSave]);

  const settingsItems: SettingItem[] = [
    {
      id: 'name',
      type: 'text',
      label: fieldLabel,
      value: draftName,
      onChange: (v) => {
        setDraftState({ sessionKey, draftName: v });
        if (deleteConfirm) setDeleteConfirm(false);
      },
      placeholder: entityType === 'project' ? 'Project name' : 'Story title',
      autoFocus: true,
      disabled: isClosing,
      onCmdEnter: handleClose,
    },
    {
      id: 'delete',
      type: 'button',
      label: ' ',
      buttonLabel: deleteConfirm ? 'Click again to delete' : `Delete ${deleteLabel}`,
      onClick: handleDeleteClick,
      disabled: isClosing,
    },
  ];

  return (
    <BaseModal
      opened={opened}
      onClose={handleClose}
      variant="dialog"
      overlayPreset="glassLight"
      header={
        <Box p={12}>
          <TopNavigation title={title} onClose={handleClose} />
        </Box>
      }
    >
      <Box p={20}>
        <Stack gap="sm">
          <SettingsGroup items={settingsItems} ariaLabel={`${title} settings`} />
        </Stack>
      </Box>
    </BaseModal>
  );
};

// src/components/common/TopNavigation.tsx
import React from 'react';
import { ActionIcon, Box, Group, Text, Button } from '@mantine/core';
import {Icon} from './Icon';

type TopNavigationProps = {
  title: string;

  /** Optional back button */
  onBack?: () => void;
  backLabel?: string;

  /** Optional close button */
  onClose?: () => void;
  closeLabel?: string;

  /** Optional save button */
  onSave?: () => void;
  saveLabel?: string;
  canSave?: boolean;

  /** Layout/styling */
  zIndex?: number;
};

export const ButtonPlaceholder = () => {
  // keeps title perfectly centered even without a button
  return (
    <Box style={{ width: 36, height: 36 }}/>
  );
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  title,
  onBack,
  backLabel = 'Back',
  onClose,
  closeLabel = 'Close',
  onSave,
  canSave = true,
  saveLabel = 'Save',
  zIndex = 10,
}) => {
  return (
    <Box
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        zIndex,
      }}
    >
      {/* Left slot */}
      <Group justify="flex-start" gap="xs" style={{ minWidth: 0 }}>
        {onBack ? (
          <ActionIcon
            aria-label={backLabel}
            variant="light"
            size="lg"
            radius="xl"
            onClick={onBack}
          >
            <Icon type="back" size={26} />
          </ActionIcon>
        ) : (
          <ButtonPlaceholder/>
        )}
      </Group>

      {/* Center title (always truly centered in the viewport) */}
      <Text
        fw={600}
        style={{
          justifySelf: 'center',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {title}
      </Text>

      {/* Right slot */}
      <Group justify="flex-end" gap="xs" style={{ minWidth: 0 }}>
        {onSave && (
          <Button
            variant="light"
            size="sm"
            radius="xl"
            onClick={onSave}
            disabled={!canSave}
          >
            {saveLabel}
          </Button>
        )}

        {onClose && (
          <ActionIcon
            aria-label={closeLabel}
            variant="light"
            size="lg"
            radius="xl"
            onClick={onClose}
          >
            <Icon type="close" size={26} />
          </ActionIcon>
        )}

        {!onClose && !onSave && (
          <ButtonPlaceholder/>
        )}
      </Group>
    </Box>
  );
};
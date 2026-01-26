// src/ui/modals/ExportProgressModal.tsx
import React from 'react';
import { Box, Text, Loader } from '@mantine/core';
import { BaseModal } from '../common/BaseModal';
import classes from './ExportProgressModal.module.scss';

export type ExportStatus =
  | 'loading'      // Loading story data
  | 'converting'   // Converting to target format
  | 'saving'       // Saving file to disk
  | 'complete'     // Export complete
  | 'error';       // Export failed

interface ExportProgressModalProps {
  opened: boolean;
  onClose: () => void;
  status: ExportStatus;
  format: 'docx' | 'pdf';
  errorMessage?: string;
}

const statusMessages: Record<ExportStatus, string> = {
  loading: 'Loading story...',
  converting: 'Converting to {{format}}...',
  saving: 'Saving file...',
  complete: 'Export complete!',
  error: 'Export failed',
};

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  opened,
  onClose,
  status,
  format,
  errorMessage,
}) => {
  const message = statusMessages[status].replace('{{format}}', format.toUpperCase());

  // Allow closing only when error or complete
  const canClose = status === 'error' || status === 'complete';

  return (
    <BaseModal
      opened={opened}
      onClose={canClose ? onClose : () => {}}
      closeOnClickOutside={canClose}
      closeOnEscape={canClose}
      size="sm"
      overlayPreset="glassStrong"
      header={<Box />} // Empty header
      headerOffsetPx={0}
    >
      <Box className={classes.content}>
        {status === 'error' ? (
          <>
            <Box className={classes.iconError}>✕</Box>
            <Text className={classes.title}>{message}</Text>
            {errorMessage && (
              <Text className={classes.error}>{errorMessage}</Text>
            )}
          </>
        ) : status === 'complete' ? (
          <>
            <Box className={classes.iconSuccess}>✓</Box>
            <Text className={classes.title}>{message}</Text>
          </>
        ) : (
          <>
            <Loader size="lg" className={classes.loader} />
            <Text className={classes.title}>{message}</Text>
          </>
        )}
      </Box>
    </BaseModal>
  );
};

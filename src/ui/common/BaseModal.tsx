// src/ui/common/BaseModal.tsx
import React from 'react';
import { Box, ScrollArea } from '@mantine/core';
import { Modal } from '@mantine/core';
import type { ModalProps as MantineModalProps } from '@mantine/core';

export type BaseModalVariant = 'dialog' | 'sheet';
export type OverlayPreset = 'glassLight' | 'glassStrong' | 'none';

const overlayPresets: Record<OverlayPreset, MantineModalProps['overlayProps']> = {
  glassLight: { backgroundOpacity: 0.16, blur: '20px' },
  glassStrong: { backgroundOpacity: 0.22, blur: '24px' },
  none: { backgroundOpacity: 0, blur: 0 },
};

type BaseModalProps = {
  opened: boolean;
  onClose: () => void;

  /** Expected: should include close button */
  header: React.ReactNode;

  /** Main content */
  children: React.ReactNode;

  /** Optional fixed footer */
  footer?: React.ReactNode;

  /** Layout */
  variant?: BaseModalVariant;

  /** Overlay */
  overlayPreset?: OverlayPreset;
  overlayProps?: MantineModalProps['overlayProps'];

  /** Behavior */
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;

  /** Sizing */
  size?: MantineModalProps['size']; // used mostly for dialog
  sheetSize?: MantineModalProps['size']; // default '90%'
  sheetHeight?: string; // default '90vh'

  /** Internal spacing for scroll content when header/footer are absolute */
  headerOffsetPx?: number; // default 120
  footerOffsetPx?: number; // default 90

  /** Extra style overrides */
  styles?: MantineModalProps['styles'];
};

export const BaseModal: React.FC<BaseModalProps> = ({
  opened,
  onClose,
  header,
  children,
  footer,

  variant = 'dialog',

  overlayPreset = 'glassLight',
  overlayProps,

  closeOnClickOutside = false,
  closeOnEscape = true,

  size = 'md',
  sheetSize = '90%',
  sheetHeight = '90vh',

  headerOffsetPx = 60,
  footerOffsetPx = 60,

  styles,
}) => {
  const resolvedOverlayProps = overlayProps ?? overlayPresets[overlayPreset];

  const isSheet = variant === 'sheet';

  const baseStyles: MantineModalProps['styles'] = isSheet
    ? {
        content: {
          height: sheetHeight,
          maxHeight: sheetHeight,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        },
      }
    : {
        // dialog: still 0 padding + header slot, but normal sizing
        body: {
          padding: 0,
        },
      };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      radius="xl"
      padding="0"
      withCloseButton={false}
      closeOnClickOutside={closeOnClickOutside}
      closeOnEscape={closeOnEscape}
      overlayProps={resolvedOverlayProps}
      yOffset={'5vh'}
      size={isSheet ? sheetSize : size}
      styles={{ ...(baseStyles ?? {}), ...(styles ?? {}) }}
    >
      <Box style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Header (absolute) */}
        <Box
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          {header}
        </Box>

        {/* Scroll body */}
        <ScrollArea style={{ height: '100%' }}>
          <Box
            style={{
              paddingTop: headerOffsetPx,
              paddingBottom: footer ? footerOffsetPx : 0,
            }}
          >
            {children}
          </Box>
        </ScrollArea>

        {/* Footer (absolute, optional) */}
        {footer ? (
          <Box
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
          >
            {footer}
          </Box>
        ) : null}
      </Box>
    </Modal>
  );
};
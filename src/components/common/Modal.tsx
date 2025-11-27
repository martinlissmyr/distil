// src/components/common/Modal.tsx
import React from 'react';
import { Modal as MatineModal, type ModalProps as MantineModalProps } from '@mantine/core';

/**
 * Shared modal shell so all app dialogs look consistent.
 * Use this instead of Mantine <Modal> directly.
 */
export type ModalProps = MantineModalProps & {
  /** Optional subtle description under the title */
  subtitle?: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({
  children,
  subtitle,
  ...props
}) => {
  return (
    <MatineModal
      centered
      radius="lg"
      overlayProps={{
        blur: 6,
        opacity: 0.35,
      }}
      styles={{
        header: {
          paddingBottom: subtitle ? 4 : 12,
        },
        title: {
          fontWeight: 600,
          fontSize: 16,
        },
        body: {
          paddingTop: subtitle ? 4 : 0,
        },
      }}
      {...props}
    >
      {subtitle && (
        <div
          style={{
            fontSize: 13,
            opacity: 0.7,
            marginBottom: 8,
          }}
        >
          {subtitle}
        </div>
      )}
      {children}
    </MatineModal>
  );
};
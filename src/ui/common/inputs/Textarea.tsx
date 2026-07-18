// src/ui/common/inputs/Textarea.tsx
import React, { useMemo } from 'react';
import {
  Badge,
  Textarea as MantineTextarea,
  Text,
  Box,
  Group,
  Button,
} from '@mantine/core';
import classes from './Textarea.module.scss';
import { Icon, type IconType } from '../Icon';
import type { RefObject } from 'react';

type TextareaProps = {
  value: string;
  onChange: (value: string) => void;

  label?: string;
  description?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  autosize?: boolean;

  /** Validation */
  required?: boolean;
  minLength?: number;
  maxLength?: number;

  actionButtonIcon?: IconType;
  actionButtonText?: string;
  onActionButtonClick?: (value: string) => void;

  textareaRef?: RefObject<HTMLTextAreaElement | null>;

  /** Optional external error override */
  error?: string;
};

function validate({
  value = '',
  required,
  minLength,
  maxLength,
}: {
  value: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}): string {
  const trimmed = value.trim();

  if (required && !trimmed) return 'Required';
  if (minLength && trimmed.length < minLength) return 'Required';

  // For maxLength: we generally *show counter turning red* rather than an error string.
  // But still return an error if you want to hard-block submit elsewhere.
  if (maxLength && value.length > maxLength) return ''; // keep empty here by design

  return '';
}

export const Textarea: React.FC<TextareaProps> = ({
  value = '',
  onChange,
  label,
  description,
  placeholder,
  minRows = 12,
  maxRows,
  autosize = true,
  required,
  minLength = 0,
  maxLength,
  error,
  actionButtonIcon = 'wizard',
  actionButtonText = 'Perform action',
  onActionButtonClick,
  textareaRef = null,
}) => {
  const internalError = useMemo(
    () => validate({ value, required, minLength, maxLength }),
    [value, required, minLength, maxLength]
  );

  const effectiveError = error ?? internalError;

  const showCounter = Boolean(maxLength && maxLength > 0);
  const charCount = value.length;
  const overMax = Boolean(maxLength && charCount > maxLength);

  const rightSection = (() => {
    if (effectiveError) {
      return (
        <Badge
          size="xs"
          variant="light"
          color="gray"
          className={classes.badge}
        >
          {effectiveError}
        </Badge>
      );
    } else if (showCounter) {
      return (
        <Badge
          size="xs"
          variant="light"
          color={overMax ? 'red' : 'gray'}
          className={classes.badge}
        >
          {charCount} / {maxLength}
        </Badge>
      );
    } else {
      return null;
    }
  })();

  const hasRightSection = Boolean(effectiveError || showCounter);

  return (
    <div className={classes.wrapper}>
      <Group justify="space-between" gap={10} className={classes.textareaLabelGroup}>
        <Text size="sm" lineClamp={1} flex={1} className={classes.textareaLabel}>
          {label}
        </Text>
        {onActionButtonClick && (
          <Box className={classes.textareaAction} flex={0}>
            <Button
              size="compact-xs"
              variant="filled"
              aria-label={actionButtonText}
              onClick={() => onActionButtonClick(value)}
              rightSection={<Icon type={actionButtonIcon} size={12}/>}
            >
              {actionButtonText}
            </Button>
          </Box>
        )}
      </Group>
      <MantineTextarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        minRows={minRows}
        maxRows={maxRows}
        autosize={autosize}
        classNames={{
          label: classes.textareaLabel,
          input: classes.textareaInput,
          section: classes.textareaSection,
        }}
        data-error={effectiveError !== ''}
        data-counter={showCounter}
        size="sm"
        {...(hasRightSection && {
          rightSection,
        })}
        ref={textareaRef}
      />
      {description && (
        <Text
          size="xs"
          className={classes.description}
          mt={4}
        >
          {description}
        </Text>
      )}
    </div>
  );
};

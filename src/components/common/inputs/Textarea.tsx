// src/components/common/inputs/Textarea.tsx
import React, { useMemo } from 'react';
import { Badge, Textarea as MantineTextarea } from '@mantine/core';
import classes from './Textarea.module.scss';

type TextareaProps = {
  value: string;
  onChange: (value: string) => void;

  placeholder?: string;
  minRows?: number;
  maxRows?: number;

  /** Validation */
  required?: boolean;
  minLength?: number;
  maxLength?: number;

  /** Optional external error override */
  error?: string;
};

function validate({
  value,
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
  value,
  onChange,
  placeholder,
  minRows = 4,
  maxRows,
  required,
  minLength,
  maxLength,
  error,
}) => {
  const internalError = useMemo(
    () => validate({ value, required, minLength, maxLength }),
    [value, required, minLength, maxLength]
  );

  const effectiveError = error ?? internalError;

  const showCounter = Boolean(maxLength && maxLength > 0);
  const charCount = value.length;
  const overMax = Boolean(maxLength && charCount > maxLength);

  return (
    <div style={{ position: 'relative' }}>
      <MantineTextarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        minRows={minRows}
        maxRows={maxRows}
        autosize
        classNames={classes}
        data-error={effectiveError !== ''}
        data-counter={showCounter}
      />

      {effectiveError ? (
        <Badge
          size="xs"
          variant="light"
          color="gray"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            pointerEvents: 'none',
          }}
        >
          {effectiveError}
        </Badge>
      ) : showCounter ? (
        <Badge
          size="xs"
          variant="light"
          color={overMax ? 'red' : 'gray'}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            pointerEvents: 'none',
          }}
        >
          {charCount} / {maxLength}
        </Badge>
      ) : null}
    </div>
  );
};
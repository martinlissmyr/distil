// src/components/wizard/inputs/TextInput.tsx
import React, { useMemo } from 'react';
import { Badge, TextInput as MantineTextInput } from '@mantine/core';
import classes from './TextInput.module.scss';

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;

  placeholder?: string;

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

  // For maxLength: show counter turning red, don’t hard-error here
  if (maxLength && value.length > maxLength) return '';

  return '';
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  placeholder,
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
      <MantineTextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
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
            top: '50%',
            transform: 'translateY(-50%)',
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
            top: '50%',
            transform: 'translateY(-50%)',
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
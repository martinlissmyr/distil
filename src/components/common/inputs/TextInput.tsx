// src/components/common/inputs/TextInput.tsx
import React, { useMemo } from 'react';
import { Badge, TextInput as MantineTextInput, Text } from '@mantine/core';
import classes from './TextInput.module.scss';

type TextInputProps = {
  value: string;
  onChange: (value: string) => void;

  label?: string;
  description?: string;
  placeholder?: string;

  /** Validation */
  required?: boolean;
  minLength?: number;
  maxLength?: number;

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
  const trimmed = value?.trim();

  if (required && !trimmed) return 'Required';
  if (minLength && trimmed.length < minLength) return 'Required';

  // For maxLength: show counter turning red, don’t hard-error here
  if (maxLength && value.length > maxLength) return '';

  return '';
}

export const TextInput: React.FC<TextInputProps> = ({
  value = '',
  onChange,
  label, 
  description,
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

  const RightSection = () => {
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
    }
  }

  return (
    <div className={classes.wrapper}>
      <MantineTextInput
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        label={label}
        placeholder={placeholder}
        radius="sm"
        classNames={{
          input: classes.textInput,
          section: classes.textInputSection
        }}
        data-error={effectiveError !== ''}
        data-counter={showCounter}
        size="sm"
        rightSection={<RightSection/>}
      />
      {description && (
        <Text
          size="xs"
          mt={4}
          className={classes.description}
        >
          {description}
        </Text>
      )}
    </div>
  );
};
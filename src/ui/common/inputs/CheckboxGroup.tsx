// src/ui/common/inputs/CheckboxGroup.tsx
import React, { useMemo } from 'react';
import { Badge, Box, Checkbox, Flex, SimpleGrid, Stack, Text } from '@mantine/core';
import classes from './CheckboxGroup.module.scss';

export type CheckboxOption = {
  value: string;
  label: string;
  description?: string;
};

type CheckboxGroupProps = {
  value: string[]; // selected values
  onChange: (value: string[]) => void;

  options: CheckboxOption[];

  /** Validation */
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;

  /** Optional external error override */
  error?: string;

  /** Layout */
  cols?: number;
};

function validate({
  value,
  required,
  minSelections,
  maxSelections,
}: {
  value: string[];
  required?: boolean;
  minSelections?: number;
  maxSelections?: number;
}): string {
  const count = Array.isArray(value) ? value.length : 0;

  if (required && count === 0) return 'Required';
  if (typeof minSelections === 'number' && count < minSelections) return 'Required';
  if (typeof maxSelections === 'number' && count > maxSelections) return 'Required';

  return '';
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  value,
  onChange,
  options,
  required,
  minSelections,
  maxSelections,
  error,
  cols = 2,
}) => {
  const selected = Array.isArray(value) ? value : [];

  const internalError = useMemo(
    () => validate({ value: selected, required, minSelections, maxSelections }),
    [selected, required, minSelections, maxSelections]
  );
  const effectiveError = error ?? internalError;

  const toggle = (optionValue: string) => {
    const next = selected.includes(optionValue)
      ? selected.filter((v) => v !== optionValue)
      : [...selected, optionValue];

    onChange(next);
  };

  const showRangeHint = typeof minSelections === 'number' && typeof maxSelections === 'number';

  return (
    <div style={{ position: 'relative' }}>
      {showRangeHint && (
        <Badge size="xs" variant="light" color="gray" mb="md">
          Select{' '}
          {maxSelections! - minSelections! > 1 ? (
            <>
              {minSelections}-{maxSelections} options
            </>
          ) : (
            <>1 option</>
          )}
        </Badge>
      )}

      <SimpleGrid cols={cols} gap="sm" overflow="hidden">
        {options.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <Box key={option.value}>
              <Checkbox.Card
                value={option.value}
                checked={checked}
                onChange={() => toggle(option.value)}
                withBorder={false}
                classNames={classes}
              >
                <Flex gap={10} align="center">
                  <Checkbox.Indicator
                    variant="outline"
                    radius="xl"
                    size="lg"
                    className={classes.indicator}
                  />
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text size="sm" c="dimmed">
                        {option.description}
                      </Text>
                    )}
                  </Stack>
                </Flex>
              </Checkbox.Card>
            </Box>
          );
        })}
      </SimpleGrid>

      {effectiveError ? (
        <Badge
          size="xs"
          variant="light"
          color="gray"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            pointerEvents: 'none',
          }}
        >
          {effectiveError}
        </Badge>
      ) : null}
    </div>
  );
};
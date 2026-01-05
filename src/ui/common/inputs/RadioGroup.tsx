// src/ui/common/inputs/RadioGroup.tsx
import React, { useMemo } from 'react';
import { Badge, Box, Flex, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import classes from './RadioGroup.module.scss';

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
};

type RadioGroupProps = {
  value: string;
  onChange: (value: string) => void;

  options: RadioOption[];

  /** Validation */
  required?: boolean;

  /** Optional external error override */
  error?: string;

  /** Layout */
  cols?: number;

  /** Styling hooks */
  radius?: number | string; // e.g. "48"
  px?: number | string;     // e.g. "15"
  py?: number | string;     // e.g. "10"
};

function validate({
  value,
  required,
}: {
  value: string;
  required?: boolean;
}): string {
  if (required && !String(value ?? '').trim()) return 'Required';
  return '';
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  options,
  required,
  error,
  cols = 2,
}) => {
  const internalError = useMemo(() => validate({ value, required }), [value, required]);
  const effectiveError = error ?? internalError;

  return (
    <div style={{ position: 'relative' }} className={classes.group}>
      <Radio.Group value={value} onChange={onChange}>
        <SimpleGrid cols={cols} spacing="sm">
          {options.map((option) => (
            <Box key={option.value}>
              <Radio.Card
                value={option.value}
                withBorder={false}
                classNames={classes}
              >
                <Flex gap={10} align="center">
                  <Radio.Indicator
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
              </Radio.Card>
            </Box>
          ))}
        </SimpleGrid>
      </Radio.Group>

      {effectiveError ? (
        <Badge
          size="xs"
          variant="light"
          color="gray"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 12,
            pointerEvents: 'none',
          }}
        >
          {effectiveError}
        </Badge>
      ) : null}
    </div>
  );
};
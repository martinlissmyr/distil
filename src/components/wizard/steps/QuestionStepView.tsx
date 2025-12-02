// src/components/wizard/steps/QuestionStepView.tsx
import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Text, 
  Textarea, 
  TextInput, 
  Group, 
  Badge, 
  Slider, 
  Radio, 
  Checkbox, 
  Box, 
  SimpleGrid, 
  Flex, 
  Title
} from '@mantine/core';
import type { QuestionStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';

type QuestionStepViewProps = {
  step: QuestionStep;
};

export const QuestionStepView: React.FC<QuestionStepViewProps> = ({ step }) => {
  const { getAnswer, setAnswer } = useAppStore();

  // Get existing answer - type varies by question type
  const existingAnswer = getAnswer(step.id);

  // Initialize state based on question type
  const getInitialValue = () => {
    if (existingAnswer !== undefined && existingAnswer !== null) {
      return existingAnswer;
    }

    // Default values by type
    if (step.questionType === 'scale') {
      return step.min ?? 0;
    } else if (step.questionType === 'multi-select') {
      return [];
    } else {
      return '';
    }
  };

  const [value, setValue] = useState<any>(getInitialValue());
  const [error, setError] = useState<string>('');

  // Update local state if answer changes externally
  useEffect(() => {
    if (existingAnswer !== undefined && existingAnswer !== null) {
      setValue(existingAnswer);
    }
  }, [existingAnswer]);

  // Update store when value changes
  useEffect(() => {
    setAnswer(step.id, value);
    validateAnswer(value);
  }, [value, step.id, setAnswer]);

  const validateAnswer = (val: any): boolean => {
    // Reset error
    setError('');

    // Check required for text/textarea
    if (step.questionType === 'text' || step.questionType === 'textarea') {
      if (step.required && !String(val || '').trim()) {
        setError('Required');
        return false;
      }

      // Check minLength
      if (step.minLength && String(val || '').trim().length < step.minLength) {
        setError('Required');
        return false;
      }

      // Check maxLength - don't set error, let the character counter turn red instead
      if (step.maxLength && String(val || '').length > step.maxLength) {
        return false;
      }
    }

    // Check required for select types
    if (step.questionType === 'single-select' || step.questionType === 'multi-select') {
      if (step.required && (!val || (Array.isArray(val) && val.length === 0))) {
        setError('Required');
        return false;
      }

      // Check min/max selections for multi-select
      if (step.questionType === 'multi-select' && Array.isArray(val)) {
        if (step.minSelections && val.length < step.minSelections) {
          setError('Required');
          return false;
        }
        if (step.maxSelections && val.length > step.maxSelections) {
          setError('Required');
          return false;
        }
      }
    }

    return true;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.currentTarget.value);
  };

  const handleScaleChange = (newValue: number) => {
    setValue(newValue);
  };

  const handleSingleSelectChange = (newValue: string) => {
    setValue(newValue);
  };

  const handleMultiSelectToggle = (optionValue: string) => {
    const currentValues = Array.isArray(value) ? value : [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter((v) => v !== optionValue)
      : [...currentValues, optionValue];
    setValue(newValues);
  };

  // Character counter for textarea
  const showCounter = step.questionType === 'textarea' && step.maxLength;
  const charCount = String(value || '').length;

  // Get options array (handle both static arrays and dynamic variables)
  const getOptions = () => {
    if (!step.options) return [];
    if (Array.isArray(step.options)) return step.options;
    // Dynamic options ({{variableName}}) - for now return empty, will be populated by LLM results
    return [];
  };

  const options = getOptions();

  return (
    <Stack gap="md">
      {/* Question text */}
      <Stack gap="20" mb="2">
        <Title order={1} size="h2" fw={600}>
          {step.question}
        </Title>
        {step.description && (
          <Text size="sm" c="dimmed">
            {step.description}
          </Text>
        )}
      </Stack>

      {/* Input based on question type */}
      {step.questionType === 'textarea' && (
        <div style={{ position: 'relative' }}>
          <Textarea
            value={value}
            onChange={handleTextChange}
            placeholder={step.placeholder}
            minRows={4}
            maxRows={10}
            autosize
            styles={{
              input: {
                paddingBottom: '32px',
                paddingRight: error || showCounter ? '85px' : undefined,
              },
            }}
          />
          {error ? (
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
              {error}
            </Badge>
          ) : showCounter ? (
            <Badge
              size="xs"
              variant="light"
              color={charCount > (step.maxLength || 0) ? 'red' : 'gray'}
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                pointerEvents: 'none',
              }}
            >
              {charCount} / {step.maxLength}
            </Badge>
          ) : null}
        </div>
      )}

      {step.questionType === 'text' && (
        <div style={{ position: 'relative' }}>
          <TextInput
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            placeholder={step.placeholder}
            styles={{
              input: {
                paddingRight: error || showCounter ? '85px' : undefined,
              },
            }}
          />
          {error ? (
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
              {error}
            </Badge>
          ) : showCounter ? (
            <Badge
              size="xs"
              variant="light"
              color={charCount > (step.maxLength || 0) ? 'red' : 'gray'}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                right: 8,
                pointerEvents: 'none',
              }}
            >
              {charCount} / {step.maxLength}
            </Badge>
          ) : null}
        </div>
      )}

      {step.questionType === 'scale' && (
        <div>
          <Slider
            value={value}
            restrictToMarks
            onChange={handleScaleChange}
            min={step.min ?? 0}
            max={step.max ?? 10}
            marks={Array.from({ length: ((step.max ?? 10) - (step.min ?? 0) + 1) }).map((_, index) => ({ value: ((step.min ?? 0) + index), label: String((step.min ?? 0) + index) }))}
            size="xl"
            label={null}
            styles={{
              markLabel: {
                textAlign: 'center'
              }
            }}
          />
          <Group justify="space-between" mt="28" ml="6" mr="6">
            <Box style={{
              opacity: Math.max(0.2, Math.min(1, 1 - ((value - step.min) / (step.max - step.min)) * 0.8))
            }}>
              <Text size="sm">{step.scaleLabels.min}</Text>
            </Box>
            <Box style={{
              opacity: Math.max(0.2, Math.min(1, 0.2 + ((value - step.min) / (step.max - step.min)) * 0.8))
            }}>
              <Text size="sm">{step.scaleLabels.max}</Text>
            </Box>
          </Group>
        </div>
      )}

      {step.questionType === 'single-select' && (
        <div>
          <Radio.Group value={value} onChange={handleSingleSelectChange}>
            <SimpleGrid cols={2} gap="sm" overflow="hidden">
              {options.map((option) => (
                <Box key={option.value}>
                  <Radio.Card
                    radius="48"
                    px="15"
                    py="10"
                    value={option.value}
                    withBorder={false}
                    bg={value == option.value ? `var(--overlay-highlighted` : `var(--overlay-subtle`}
                  >
                    <Flex gap="10" align="center">
                      <Radio.Indicator
                        variant="outline"
                        radius="xl"
                        size="lg"
                      />
                      <Stack gap="0">
                        <Text size="sm" fw={500}>{option.label}</Text>
                        {option.description && (
                          <Text size="sm" c="dimmed">{option.description}</Text>
                        )}
                      </Stack>
                    </Flex>
                  </Radio.Card>
                </Box>
              ))}
            </SimpleGrid>
          </Radio.Group>
        </div>
      )}

      {step.questionType === 'multi-select' && (
        <div>
          {step.minSelections && step.maxSelections && (
            <Badge
              size="xs"
              variant="light"
              color="gray"
              mb="md"
            >
              Select{" "}
              {step.maxSelections-step.minSelections > 1 && (
                <>
                {step.minSelections}-{step.maxSelections} options
                </>
              )}
              {step.maxSelections-step.minSelections == 1 && (
                <>
                1 option
                </>
              )}
            </Badge>
          )}
          <SimpleGrid cols={2} gap="sm" overflow="hidden">
            {options.map((option) => (
              <Box key={option.value}>
                <Checkbox.Card
                  radius="48"
                  px="15"
                  py="10"
                  value={option.value}
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={() => handleMultiSelectToggle(option.value)}
                  withBorder={false}
                  bg={Array.isArray(value) && value.includes(option.value) ? `var(--overlay-highlighted` : `var(--overlay-subtle`}
                >
                  <Flex gap="10" align="center">
                    <Checkbox.Indicator
                      variant="outline"
                      radius="xl"
                      size="lg"
                    />
                    <Stack gap="0">
                      <Text size="sm" fw={500}>{option.label}</Text>
                      {option.description && (
                        <Text size="sm" c="dimmed">{option.description}</Text>
                      )}
                    </Stack>
                  </Flex>
                </Checkbox.Card>
              </Box>
            ))}
          </SimpleGrid>
        </div>
      )}
    </Stack>
  );
};

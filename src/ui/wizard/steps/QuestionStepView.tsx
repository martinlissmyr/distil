// src/ui/wizard/steps/QuestionStepView.tsx
import React from 'react';
import {
  Stack,
  Text,
  Title
} from '@mantine/core';
import type { QuestionStep, WizardValue } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';

import { ScaleSlider } from '../../common/inputs/ScaleSlider';
import { Textarea } from '../../common/inputs/Textarea';
import { TextInput } from '../../common/inputs/TextInput';
import { RadioGroup, type RadioOption } from '../../common/inputs/RadioGroup';
import { CheckboxGroup, type CheckboxOption } from '../../common/inputs/CheckboxGroup';


type QuestionStepViewProps = {
  step: QuestionStep;
};

function isOptionRecord(value: WizardValue): value is RadioOption {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string' &&
    'label' in value &&
    typeof value.label === 'string'
  );
}

function toStringArray(value: WizardValue): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

export const QuestionStepView: React.FC<QuestionStepViewProps> = ({ step }) => {
  const { getAnswer, setAnswer, activeWizard } = useAppStore();

  // Get existing answer - type varies by question type
  const existingAnswer = getAnswer(step.id);

  const getValue = (): WizardValue => {
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

  const value = getValue();

  const handleScaleChange = (newValue: number) => {
    setAnswer(step.id, newValue);
  };

  const handleSingleSelectChange = (newValue: string) => {
    setAnswer(step.id, newValue);
  };

  // Get options array (handle both static arrays and dynamic variables)
  const getOptions = (): RadioOption[] => {
    if (!step.options) return [];
    if (Array.isArray(step.options)) return step.options;

    // Dynamic options: "{{variableName}}" references LLM results
    if (typeof step.options === 'string') {
      const match = step.options.match(/^\{\{(.+?)\}\}$/);
      if (match && activeWizard) {
        const resultKey = match[1].trim();
        const result = activeWizard.llmResults[resultKey];

        // Result should be an array of option objects
        if (Array.isArray(result)) {
          return result.filter(isOptionRecord);
        }

        console.warn(`[QuestionStepView] Dynamic options "${resultKey}" not found or not an array in llmResults`);
      }
    }

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
        <Textarea
          value={String(value ?? '')}
          onChange={(nextValue) => setAnswer(step.id, nextValue)}
          placeholder={step.placeholder}
          required={step.required}
          minLength={step.minLength}
          maxLength={step.maxLength}
          description={"Tip: Use dictation to answer longer questions. Read about how to enable it on your mac. Remember to select the correct language the first time you use dictation."}
        />
      )}

      {step.questionType === 'text' && (
        <TextInput
          value={String(value ?? '')}
          onChange={(nextValue) => setAnswer(step.id, nextValue)}
          placeholder={step.placeholder}
          required={step.required}
          minLength={step.minLength}
          maxLength={step.maxLength}
        />
      )}

      {step.questionType === 'scale' && (
        <ScaleSlider
          value={Number(value ?? step.min ?? 0)}
          onChange={handleScaleChange}
          min={step.min ?? 0}
          max={step.max ?? 10}
          labels={step.scaleLabels ?? { min: String(step.min ?? 0), max: String(step.max ?? 10) }}
        />
      )}

      {step.questionType === 'single-select' && (
        <RadioGroup
          value={String(value ?? '')}
          onChange={handleSingleSelectChange}
          options={options}
          required={step.required}
        />
      )}

      {step.questionType === 'multi-select' && (
        <CheckboxGroup
          value={toStringArray(value)}
          onChange={(nextValue) => setAnswer(step.id, nextValue)}
          options={options as CheckboxOption[]}
          required={step.required}
          minSelections={step.minSelections}
          maxSelections={step.maxSelections}
        />
      )}
    </Stack>
  );
};

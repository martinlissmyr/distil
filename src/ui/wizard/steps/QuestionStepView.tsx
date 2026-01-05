// src/ui/wizard/steps/QuestionStepView.tsx
import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  Title
} from '@mantine/core';
import type { QuestionStep } from '../../../wizards/types';
import { useAppStore } from '../../../state/useAppStore';

import { ScaleSlider } from '../../common/inputs/ScaleSlider';
import { Textarea } from '../../common/inputs/Textarea';
import { TextInput } from '../../common/inputs/TextInput';
import { RadioGroup } from '../../common/inputs/RadioGroup';
import { CheckboxGroup } from '../../common/inputs/CheckboxGroup';


type QuestionStepViewProps = {
  step: QuestionStep;
};

export const QuestionStepView: React.FC<QuestionStepViewProps> = ({ step }) => {
  const { getAnswer, setAnswer, activeWizard } = useAppStore();

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

    // Check required for text/textarea
    if (step.questionType === 'text' || step.questionType === 'textarea') {
      if (step.required && !String(val || '').trim()) {
        return false;
      }

      // Check minLength
      if (step.minLength && String(val || '').trim().length < step.minLength) {
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
        return false;
      }

      // Check min/max selections for multi-select
      if (step.questionType === 'multi-select' && Array.isArray(val)) {
        if (step.minSelections && val.length < step.minSelections) {
          return false;
        }
        if (step.maxSelections && val.length > step.maxSelections) {
          return false;
        }
      }
    }

    return true;
  };

  const handleScaleChange = (newValue: number) => {
    setValue(newValue);
  };

  const handleSingleSelectChange = (newValue: string) => {
    setValue(newValue);
  };

  // Get options array (handle both static arrays and dynamic variables)
  const getOptions = () => {
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
          return result;
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
          onChange={setValue}
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
          onChange={setValue}
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
          labels={step.scaleLabels as any}
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
          value={Array.isArray(value) ? value : []}
          onChange={setValue}
          options={options}
          required={step.required}
          minSelections={step.minSelections}
          maxSelections={step.maxSelections}
        />
      )}
    </Stack>
  );
};

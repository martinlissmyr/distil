// src/ui/wizard/steps/InformationStepView.tsx
import { 
  Box, 
  Text,
} from '@mantine/core';
import type { InformationStep } from '../../../wizards/types';

type InformationStepViewProps = {
  step: InformationStep;
};

export const InformationStepView: React.FC<InformationStepViewProps> = ({ step }) => {
  return (
    <Box>
      {/* Question text */}
      {step.description && (
        <Text size="md">
          {step.description}
        </Text>
      )}
    </Box>
  );
};

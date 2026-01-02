// src/ui/wizard/steps/InformationStepView.tsx
import { 
  Box, 
  Text,
  Image,
} from '@mantine/core';
import type { InformationStep } from '../../../wizards/types';

type InformationStepViewProps = {
  step: InformationStep;
};

export const InformationStepView: React.FC<InformationStepViewProps> = ({ step }) => {
  return (
    <Box>
      {/* Question text */}
      {step.illustration && (
        <Box my={40} justify="center">
          <Image
            src={`/src/assets/illustrations/${step.illustration}.svg`}
            h={300}
            w="auto"
            fit="contain"
            style={{
              margin: '0 auto',
              filter: 'invert()',
              opacity: '.2',
            }}
          />
        </Box>
      )}
      {step.description && (
        <Text size="md">
          {step.description}
        </Text>
      )}
    </Box>
  );
};

// src/ui/wizard/steps/InformationStepView.tsx
import { 
  Box, 
  Text,
  Image,
} from '@mantine/core';
import type { InformationStep } from '../../../wizards/types';
import classes from './InformationStepView.module.scss';

type InformationStepViewProps = {
  step: InformationStep;
};

export const InformationStepView: React.FC<InformationStepViewProps> = ({ step }) => {
  return (
    <Box className={classes.layout}>
      {/* Question text */}
      {step.illustration && (
        <Box my={40} justify="center">
          <Image
            src={`/src/assets/illustrations/${step.illustration}.svg`}
            h={300}
            w="auto"
            fit="contain"
            className={classes.illustration}
          />
        </Box>
      )}
      {step.description && (
        <Text size="md" className={classes.text}>
          {step.description}
        </Text>
      )}
    </Box>
  );
};

// src/ui/wizard/steps/InformationStepView.tsx
import {
  Box,
  Image,
} from '@mantine/core';
import type { InformationStep } from '../../../wizards/types';
import classes from './InformationStepView.module.scss';
import { MarkdownContent } from '../../common/MarkdownContent';

type InformationStepViewProps = {
  step: InformationStep;
};

export const InformationStepView: React.FC<InformationStepViewProps> = ({ step }) => {
  return (
    <Box className={classes.layout}>
      {/* Question text */}
      {step.illustration && (
        <Box my={40} style={{ display: 'flex', justifyContent: 'center' }}>
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
        <Box className={classes.text}>
          <MarkdownContent content={step.description} size="md" compact={false}/>
        </Box>
      )}
    </Box>
  );
};

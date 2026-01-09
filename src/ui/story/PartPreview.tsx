import React from 'react';
import { Box, Text } from '@mantine/core';
import { Icon } from '../common/Icon';
import classes from './PartPreview.module.scss';

type PartPreviewProps = {
  summary: string;
  position: 'previous' | 'next';
  onClick: () => void;
};

export const PartPreview: React.FC<PartPreviewProps> = ({
  summary,
  position,
  onClick,
}) => {
  return (
    <Box
      className={classes.preview}
      data-position={position}
      onClick={onClick}
    >
      {position === 'next' && (
        <Box className={classes.icon}>
          <Icon type="down" size={20} />
        </Box>
      )}
      <Text className={classes.summary} size="sm">
        {position === 'next' && (
          <>In next chapter:{" "}</>
        )}
        {position === 'previous' && (
          <>In previous chapter:{" "}</>
        )}
        {summary || 'No summary available'}
      </Text>
      {position === 'previous' && (
        <Box className={classes.icon}>
          <Icon type="up" size={20} />
        </Box>
      )}
    </Box>
  );
};

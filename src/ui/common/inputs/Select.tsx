// src/ui/common/inputs/Select.tsx
import React from 'react';
import { Select as MantineSelect, Text } from '@mantine/core';
import classes from './Select.module.scss';

type SelectProps = {
  value: string;
  onChange: (value: string) => void;

  label?: string;
  description?: string;
  placeholder?: string;
  data: any;
};

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  label,
  description,
  data,
}) => {
  return (
    <div className={classes.wrapper}>
      <MantineSelect
        label={label}
        value={value}
        checkIconPosition="right"
        onChange={(value) => onChange(value || '')}
        radius="sm"
        data={data}
        classNames={{
          input: classes.selectInput,
          dropdown: classes.selectDropdown
        }}
        size="sm"
      />
      {description && (
        <Text
          size="xs"
          className={classes.description}
          mt={4}
        >
          {description}
        </Text>
      )}
    </div>
  );
};
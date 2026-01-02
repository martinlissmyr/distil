// src/ui/common/inputs/ScaleSlider.tsx
import React, { useMemo } from 'react';
import { Box, Group, Slider, Text } from '@mantine/core';
import styles from './ScaleSlider.module.scss';

type ScaleLabels = { min: string; max: string };

type ScaleSliderProps = {
  value: number;
  onChange: (value: number) => void;

  min?: number;
  max?: number;

  labels: ScaleLabels;

  /** Optional classNames mapping (e.g. your slider.module.scss) */
  classNames?: Partial<
    Record<'root' | 'track' | 'bar' | 'mark' | 'markLabel' | 'thumb', string>
  >;

  size?: React.ComponentProps<typeof Slider>['size'];
  thumbSize?: number;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const ScaleSlider: React.FC<ScaleSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 10,
  labels,
  size = 'xl',
  thumbSize = 22,
}) => {
  const marks = useMemo(() => {
    const count = max - min + 1;
    return Array.from({ length: count }).map((_, i) => {
      const v = min + i;
      return { value: v, label: String(v) };
    });
  }, [min, max]);

  const denom = max - min || 1;
  const t = clamp((value - min) / denom, 0, 1);

  const leftOpacity = clamp(1 - t * 0.8, 0.2, 1);
  const rightOpacity = clamp(0.2 + t * 0.8, 0.2, 1);

  return (
    <Box>
      <Slider
        value={value}
        onChange={onChange}
        restrictToMarks
        min={min}
        max={max}
        marks={marks}
        size={size}
        label={null}
        thumbSize={thumbSize}
        classNames={{
          track: styles.track,
          bar: styles.bar,
          mark: styles.mark,
          markLabel: styles.markLabel,
          thumb: styles.thumb,
        }}
      />

      <Group justify="space-between" mt={28} ml={6} mr={6}>
        <Box style={{ opacity: leftOpacity }}>
          <Text size="sm">{labels.min}</Text>
        </Box>
        <Box style={{ opacity: rightOpacity }}>
          <Text size="sm">{labels.max}</Text>
        </Box>
      </Group>
    </Box>
  );
};
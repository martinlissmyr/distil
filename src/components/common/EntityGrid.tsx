// src/components/common/EntityGrid.tsx
import React from 'react';
import { Box, Group } from '@mantine/core';
import { EntityCard, CreateEntityCard } from './EntityCard';

type EntityGridProps<T> = {
  items: T[];
  /** unique id for each item */
  getId: (item: T) => string;
  /** label / title to show in the card */
  getLabel: (item: T) => string;

  onSelect: (id: string) => void;
  onEdit: (id: string) => void;

  /** called when the “+” card is clicked */
  onCreate: () => void;
  title: string;
};

export function EntityGrid<T>({
  items,
  getId,
  getLabel,
  onSelect,
  onEdit,
  onCreate,
  Icon,
  title,
}: EntityGridProps<T>) {
  return (
    <Box p="xl">
      {title && (
        <h1
          style={{
            fontWeight: 200,
            margin: '0 0 20px 0'
          }}
        >{title}</h1>
      )}
      <Group gap="lg">
        {items.map((item) => {
          const id = getId(item);
          return (
            <EntityCard
              key={id}
              id={id}
              label={getLabel(item)}
              onEdit={onEdit}
              onSelect={onSelect}
              Icon={Icon}
            />
          );
        })}

        <CreateEntityCard
          onCreate={onCreate}
        />
      </Group>
    </Box>
  );
}
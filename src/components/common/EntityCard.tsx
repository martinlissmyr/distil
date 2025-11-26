import React from 'react';
import { Text, ActionIcon, Group, Card, Box, Stack } from '@mantine/core';
import { Pencil, Plus } from 'lucide-react';

type EntityCardProps<T> = {
  id: string;
  label: string;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
};

type CreateEntityCardProps<T> = {
  /** called when the “+” card is clicked */
  onCreate: () => void;
};

const WIDTH = 220;
const HEIGHT = 260;

export function EntityCard<T>({
  id,
  label,
  onSelect,
  onEdit,
  Icon,
}: EntityCardProps<T>) {
  return (
    <Card
      onClick={() => onSelect(id)}
      className="entityCard"
      styles={{
        root: {
          cursor: 'pointer',
          width: WIDTH,
          height: HEIGHT,
          position: 'relative',
          backgroundColor: 'var(--overlay)',
          borderRadius: '16px',
        },
      }}
    >
      <ActionIcon
        variant="subtle"
        size="md"
        style={{ position: 'absolute', top: 12, right: 12 }}
        onClick={(e) => {
          e.stopPropagation(); // don’t also select
          onEdit(id);
        }}
      >
        <Pencil size={16} />
      </ActionIcon>

      <Stack justify="center" align="center" gap="xs" style={{ height: '100%' }}>
        <Box>
          <Icon size={60} strokeWidth={1} style={{opacity: .3}}/>
        </Box>
        <Text fw={700} ta="center">
          {label}
        </Text>
      </Stack>
    </Card>
  );
}

export function CreateEntityCard<T>({
  onCreate,
}: CreateEntityCardProps<T>) {
  return (
    <Card
      className="entityCard"
      onClick={onCreate}
      style={{
        cursor: 'pointer',
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--overlay)',
        borderRadius: '16px',
      }}
    >
      <Plus size={60} strokeWidth={1}/>
    </Card>
  );
}

import React from 'react';
import { Text, ActionIcon, Group, Card, Box, Stack } from '@mantine/core';
import { Pencil, Plus } from 'lucide-react';
import styles from './EntityCard.module.scss';

type EntityCardProps<T> = {
  id: string;
  label: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: any }>;
};

type CreateEntityCardProps<T> = {
  /** called when the “+” card is clicked */
  onCreate: () => void;
};

export function EntityCard<T>({
  id,
  label,
  onSelect,
  onEdit,
  Icon,
}: EntityCardProps<T>) {
  return (
    <Stack space={1} onClick={() => onSelect(id)} className={styles.entityCardWrapper}>
      <Card className={styles.entityCard}>
        {onEdit && (
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
        )}

        <Stack justify="center" align="center" gap="xs" style={{ height: '100%' }}>
          <Box>
            <Icon size={60} strokeWidth={1} style={{opacity: .3}}/>
          </Box>
        </Stack>
      </Card>
      <Text fw={700} ta="center">
        {label}
      </Text>
    </Stack>
  );
}

export function CreateEntityCard<T>({
  onCreate,
}: CreateEntityCardProps<T>) {
  return (
    <Stack space={1} onClick={onCreate} className={styles.entityCardWrapper}>
      <Card className={styles.entityCard}>
        <Plus size={60} strokeWidth={1}/>
      </Card>
      <Text fw={700} ta="center">
        New
      </Text>
    </Stack>
  );
}

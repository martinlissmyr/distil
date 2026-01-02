import React from 'react';
import { Text, ActionIcon, Group, Card, Box, Stack } from '@mantine/core';
import styles from './EntityCard.module.scss';
import {Icon} from './Icon'

type EntityCardProps<T> = {
  id: string;
  label: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: any }>;
};

export function EntityCard<T>({
  id,
  label,
  onSelect,
  onEdit,
  icon,
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
            <Icon type="edit" size={16} />
          </ActionIcon>
        )}

        <Stack justify="center" align="center" gap="xs" style={{ height: '100%' }}>
          <Box>
            <Icon type={icon} size={60} strokeWidth={1} style={{opacity: .3}}/>
          </Box>
        </Stack>
      </Card>
      <Text fw={700} ta="center">
        {label}
      </Text>
    </Stack>
  );
}

type CreateEntityCardProps<T> = {
  onCreate: () => void;
  label?: string;
};

export function CreateEntityCard<T>({
  onCreate,
  label = "New"
}: CreateEntityCardProps<T>) {
  return (
    <Stack space={1} onClick={onCreate} className={styles.entityCardWrapper}>
      <Card className={styles.entityCard}>
        <Icon type="add" size={60} strokeWidth={1}/>
      </Card>
      <Text fw={700} ta="center">
        {label}
      </Text>
    </Stack>
  );
}

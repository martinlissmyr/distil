import { Text, ActionIcon, Card, Box, Stack, Textarea, Flex } from '@mantine/core';
import { useDebouncedCallback } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import styles from './EntityCard.module.scss';
import {Icon} from './Icon'

type EntityCardProps = {
  id: string;
  label: string;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  icon?: string;
  number: number;
  mode?: 'grid' | 'list';
  sorting?: boolean;
  text?: string;
  comment?: string;
  onCommentChange?: (newComment: string) => void;
};

export function EntityCard({
  id,
  label,
  onSelect,
  onEdit,
  onDelete,
  icon,
  number,
  mode = 'grid',
  sorting = true,
  text,
  comment,
  onCommentChange,
}: EntityCardProps) {
  const isListMode = mode === 'list';

  // Local state for smooth typing experience
  const [localComment, setLocalComment] = useState(comment || '');

  // Sync local state when prop changes (e.g., switching entities)
  useEffect(() => {
    setLocalComment(comment || '');
  }, [comment]);

  const debouncedCommentChange = useDebouncedCallback((value: string) => {
    if (onCommentChange) {
      onCommentChange(value);
    }
  }, 800);

  const handleCommentChange = (value: string) => {
    setLocalComment(value); // Update immediately for smooth typing
    debouncedCommentChange(value); // Debounce the callback to parent
  };

  const actionButtons = (
    <Flex gap="xs" className={styles.actionButtons}>
      {onEdit && (
        <ActionIcon
          variant="subtle"
          size="md"
          onClick={(e) => {
            e.stopPropagation(); // don't also select
            onEdit(id);
          }}
        >
          <Icon type="edit" size={16} />
        </ActionIcon>
      )}
      {onDelete && (
        <ActionIcon
          variant="subtle"
          size="md"
          onClick={(e) => {
            e.stopPropagation(); // don't also select
            onDelete(id);
          }}
        >
          <Icon type="trash" size={16} />
        </ActionIcon>
      )}
    </Flex>
  );

  if (isListMode) {
    return (
      <Box
        onClick={() => {
          if (sorting) return;
          onSelect(id);
        }}
        className={styles.entityListCardWrapper}
      >
        <Flex className={styles.listCardIcon}>
          {icon && (
            <Icon type={icon as any} size={40} strokeWidth={1} style={{opacity: .3}}/>
          )}
          {!icon && number && (
            <Box>{number}</Box>
          )}
        </Flex>
        <Stack gap={4} style={{ flex: 1 }} className={styles.listCardContent}>
          {label && (
            <Text size="md" fw={700}>
              {label}
            </Text>
          )}
          {text && (
            <Text size="md" lineClamp={sorting ? 2 : 30} style={{ overflow: 'ellipsis' }}>
              {text}
            </Text>
          )}
          {onCommentChange && (
            <Textarea
              value={localComment}
              onChange={(e) => handleCommentChange(e.currentTarget.value)}
              placeholder="Add a note..."
              variant="unstyled"
              autosize
              size="sm"
              radius={0}
              classNames={{
                input: styles.commentField,
              }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </Stack>
        {actionButtons}
      </Box>
    );
  }

  return (
    <Stack gap={8} onClick={() => onSelect(id)} className={styles.entityGridCardWrapper}>
      <Card className={styles.entityGridCard}>
        <Stack justify="center" align="center" gap="xs" style={{ height: '100%' }}>
          <Box>
            <Icon type={icon as any} size={60} strokeWidth={1} style={{opacity: .3}}/>
          </Box>
        </Stack>
        {actionButtons}
      </Card>
      <Text fw={700} ta="center" lineClamp={2}>
        {label}
      </Text>
    </Stack>
  );
}

type CreateEntityCardProps = {
  onCreate: () => void;
  label?: string;
  mode?: 'grid' | 'list';
};

export function CreateEntityCard({
  onCreate,
  label = "New",
  mode = 'grid',
}: CreateEntityCardProps) {
  const isListMode = mode === 'list';
  const wrapperClass = isListMode ? styles.entityListCardWrapper : styles.entityGridCardWrapper;
  const cardClass = isListMode ? styles.entityListCard : styles.entityGridCard;

  if (isListMode) {
    return (
      <Box onClick={onCreate} className={`${styles.entityListCardWrapper} ${styles.entityListCreateCardWrapper}`}>
        <Flex align="center" justify="center" className={styles.listCardIcon}>
          <Icon type="add" size={40} strokeWidth={1}/>
        </Flex>
        <Box className={styles.listCardContent}>
          <Text fw={700} ta="left" style={{ flex: 1 }}>
            {label}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Stack gap={8} onClick={onCreate} className={wrapperClass}>
      <Card className={cardClass}>
        <Icon type="add" size={60} strokeWidth={1}/>
      </Card>
      <Text fw={700} ta="center">
        {label}
      </Text>
    </Stack>
  );
}

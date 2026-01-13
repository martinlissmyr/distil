import React from 'react';
import { Box, Flex } from '@mantine/core';
import { EntityCard, CreateEntityCard } from './EntityCard';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';

// ─────────────────────────────────────────────────────────────
// Sortable item wrapper (only used when sorting=true)
// ─────────────────────────────────────────────────────────────
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

// Non-sortable wrapper
function StaticItem({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

type EntityGridProps<T> = {
  items: T[];
  getId: (item: T) => string;
  getLabel?: (item: T) => string;
  getOrderNumber?: (item: T) => number;

  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onCreate: () => void;
  onReorderEntities: (ids: string[]) => void;

  icon?: string;

  title?: string;
  createLabel?: string;
  mode?: 'grid' | 'list';
  sorting?: boolean;

  getText?: (item: T) => string | undefined;
  getComment?: (item: T) => string | undefined;
  onCommentChange?: (id: string, newComment: string) => void;
  onDelete?: (id: string) => void;
};

export function EntityGrid<T>({
  items,
  getId,
  getLabel,
  getOrderNumber,
  onSelect,
  onEdit,
  onCreate,
  onReorderEntities,
  icon,
  createLabel,
  mode = 'grid',
  sorting = true,
  getText,
  getComment,
  onCommentChange,
  onDelete,
}: EntityGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const ids = React.useMemo(() => items.map(getId), [items, getId]);

  const handleDragEnd = React.useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over) return;

      const activeId = String(active.id);
      const overId = String(over.id);
      if (activeId === overId) return;

      const oldIndex = ids.indexOf(activeId);
      const newIndex = ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;

      onReorderEntities(arrayMove(ids, oldIndex, newIndex));
    },
    [ids, onReorderEntities]
  );

  const itemList = (
    <>
      {items.map((item, n) => {
        const id = getId(item);

        const card = (
          <EntityCard
            id={id}
            label={getLabel ? (getLabel(item) ?? '') : ''}
            onEdit={onEdit}
            onSelect={onSelect}
            icon={icon || undefined}
            number={getOrderNumber ? getOrderNumber(item) : n}
            mode={mode}
            sorting={sorting}
            text={getText ? getText(item) : undefined}
            comment={getComment ? getComment(item) : undefined}
            onCommentChange={
              onCommentChange ? (newComment) => onCommentChange(id, newComment) : undefined
            }
            onDelete={onDelete}
          />
        );

        return sorting ? (
          <SortableItem key={id} id={id}>
            {card}
          </SortableItem>
        ) : (
          <StaticItem key={id}>
            {card}
          </StaticItem>
        );
      })}
    </>
  );

  const strategy = mode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy;

  return (
    <Box p="xl">
      <Flex
        gap={mode === 'grid' ? 'lg' : 8}
        justify={mode === 'grid' ? 'center' : 'flex-start'}
        direction={mode === 'grid' ? 'row' : 'column'}
        wrap={mode === 'grid' ? 'wrap' : 'nowrap'}
        data-sorting={sorting}
      >
        {sorting ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={strategy}>
              {itemList}
            </SortableContext>
          </DndContext>
        ) : (
          itemList
        )}

        {mode === 'grid' && (
          <CreateEntityCard onCreate={onCreate} label={createLabel} mode={mode} />
        )}
      </Flex>
    </Box>
  );
}
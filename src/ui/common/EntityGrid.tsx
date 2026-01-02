// src/ui/common/EntityGrid.tsx
import React from 'react';
import { Box, Group, Flex } from '@mantine/core';
import { EntityCard, CreateEntityCard } from './EntityCard';
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
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
// Sortable item wrapper
// ─────────────────────────────────────────────────────────────
function SortableItem({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

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

  /** called with reordered ids after drag */
  onReorderEntities: (ids: string[]) => void;

  /** icon component passed through to EntityCard */
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;

  title?: string;
  createLabel?: string;
};

export function EntityGrid<T>({
  items,
  getId,
  getLabel,
  onSelect,
  onEdit,
  onCreate,
  onReorderEntities,
  icon,
  createLabel,
}: EntityGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
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

      const reorderedIds = arrayMove(ids, oldIndex, newIndex);
      onReorderEntities(reorderedIds);
    },
    [ids, onReorderEntities]
  );

  return (
    <Box p="xl">
      <Flex
        gap="lg"
        justify="center"
        direction="row"
        wrap="wrap"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            {items.map((item) => {
              const id = getId(item);
              return (
                <SortableItem key={id} id={id}>
                  <EntityCard
                    id={id}
                    label={getLabel(item)}
                    onEdit={onEdit}
                    onSelect={onSelect}
                    icon={icon}
                  />
                </SortableItem>
              );
            })}
          </SortableContext>
        </DndContext>

        <CreateEntityCard onCreate={onCreate} label={createLabel} />
      </Flex>
    </Box>
  );
}
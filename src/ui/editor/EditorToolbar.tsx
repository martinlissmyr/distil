import React from 'react';
import { Group, Button } from '@mantine/core';

export type ToolbarItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
};

type EditorToolbarProps = {
  items: ToolbarItem[];
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ items, editorType = "prose" }) => {
  return (
    <>
      {items.map((item) => (
        <Button
          key={item.id}
          size="xs"
          variant="subtle"
          onClick={item.onClick}
        >
          {item.icon ?? item.label}
        </Button>
      ))}
    </>
  );
};
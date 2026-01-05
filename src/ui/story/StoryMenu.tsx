// src/ui/story/StoryMenu.tsx
import React from 'react';
import { Menu } from '@mantine/core';
import { Icon } from '../common/Icon';

export type StoryMenuProps = {
  /** Whether the menu is opened */
  opened: boolean;
  /** Close the menu */
  onClose: () => void;
  /** Whether multi-part mode is enabled */
  partsEnabled: boolean;
  /** Enable multi-part mode */
  onEnableParts: () => void;
  /** Additional menu items can be added here in the future */
};

/**
 * Story management menu that appears when clicking the "more" button in TopNavigation.
 * This is a controlled menu component that should be rendered alongside the TopNavigation.
 *
 * Current options:
 * - Enable Chapters (when partsEnabled is false)
 *
 * Future options could include:
 * - Story settings
 * - Export options
 * - Version history
 * - etc.
 */
export const StoryMenu: React.FC<StoryMenuProps> = ({
  opened,
  onClose,
  partsEnabled,
  onEnableParts,
}) => {
  // Note: This menu doesn't have a visible target - it's controlled by the "more" button
  // in TopNavigation. The menu will be positioned at the top-right of the screen.
  return (
    <Menu opened={opened} onClose={onClose} position="bottom-end" withinPortal={false}>
      <Menu.Target>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0 }} />
      </Menu.Target>
      <Menu.Dropdown>
        {!partsEnabled && (
          <Menu.Item
            leftSection={<Icon type="parts" size={16} />}
            onClick={() => {
              onEnableParts();
              onClose();
            }}
          >
            Enable Chapters
          </Menu.Item>
        )}
        {/* Future menu items can be added here */}
      </Menu.Dropdown>
    </Menu>
  );
};

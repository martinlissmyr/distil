// src/ui/common/TopNavigation.tsx
import React from 'react';
import { ActionIcon, Box, Group, Text, Button, Menu } from '@mantine/core';
import { Icon } from './Icon';
import type { IconType } from './Icon';

export type TopNavigationButton = {
  label?: string;
  onClick: () => void;
  icon?: IconType;
  enabled?: boolean;
};

export type TopNavigationMenuItem = {
  label: string;
  onClick: () => void;
  icon?: IconType;
};

type TopNavigationProps = {
  title: string;

  /** Optional back button */
  onBack?: () => void;
  backLabel?: string;

  /** Optional close button */
  onClose?: () => void;
  closeLabel?: string;

  /** Buttons to render in the right slot (replaces onSave/saveLabel/canSave) */
  buttons?: TopNavigationButton[];

  /** Menu items to render in a "more" menu button */
  menuItems?: TopNavigationMenuItem[];

  /** Layout/styling */
  zIndex?: number;
};

export const ButtonPlaceholder = () => {
  // keeps title perfectly centered even without a button
  return (
    <Box style={{ width: 36, height: 36 }}/>
  );
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  title,
  onBack,
  backLabel = 'Back',
  onClose,
  closeLabel = 'Close',
  buttons = [],
  menuItems = [],
  zIndex = 10,
}) => {
  const hasRightContent = buttons.length > 0 || menuItems.length > 0 || onClose;

  return (
    <Box
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        zIndex,
      }}
    >
      {/* Left slot */}
      <Group justify="flex-start" gap="xs" style={{ minWidth: 0 }}>
        {onBack ? (
          <ActionIcon
            aria-label={backLabel}
            variant="light"
            size="lg"
            radius="xl"
            onClick={onBack}
          >
            <Icon type="back" size={26} />
          </ActionIcon>
        ) : (
          <ButtonPlaceholder/>
        )}
      </Group>

      {/* Center title (always truly centered in the viewport) */}
      <Text
        fw={600}
        style={{
          justifySelf: 'center',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {title}
      </Text>

      {/* Right slot */}
      <Group justify="flex-end" gap="xs" style={{ minWidth: 0 }}>
        {/* Button group */}
        {buttons.length > 0 && (
          <Button.Group>
            {buttons.map((button, index) => {
              const enabled = button.enabled ?? true;

              // Icon-only button
              if (button.icon && !button.label) {
                return (
                  <Button
                    key={index}
                    aria-label={button.icon}
                    variant="light"
                    size="sm"
                    onClick={button.onClick}
                    disabled={!enabled}
                  >
                    <Icon type={button.icon} size={20} />
                  </Button>
                );
              }

              // Button with label (and optional icon)
              return (
                <Button
                  key={index}
                  variant="light"
                  size="sm"
                  onClick={button.onClick}
                  disabled={!enabled}
                  leftSection={button.icon ? <Icon type={button.icon} size={16} /> : undefined}
                >
                  {button.label}
                </Button>
              );
            })}
          </Button.Group>
        )}

        {/* Menu button */}
        {menuItems.length > 0 && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon
                aria-label="More options"
                variant="light"
                size="lg"
                radius="xl"
              >
                <Icon type="more" size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {menuItems.map((item, index) => (
                <Menu.Item
                  key={index}
                  leftSection={item.icon ? <Icon type={item.icon} size={16} /> : undefined}
                  onClick={item.onClick}
                >
                  {item.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}

        {onClose && (
          <ActionIcon
            aria-label={closeLabel}
            variant="light"
            size="lg"
            radius="xl"
            onClick={onClose}
          >
            <Icon type="close" size={26} />
          </ActionIcon>
        )}

        {!hasRightContent && (
          <ButtonPlaceholder/>
        )}
      </Group>
    </Box>
  );
};
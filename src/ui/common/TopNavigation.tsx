// src/ui/common/TopNavigation.tsx
import React from 'react';
import { ActionIcon, Box, Group, Text, Button, Menu, Tooltip, Flex } from '@mantine/core';
import { Icon } from './Icon';
import type { IconType } from './Icon';
import classes from './TopNavigation.module.scss';

export type TopNavigationButton = {
  label: string;
  onClick: () => void;
  icon?: IconType;
  iconOnly?: boolean;
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
  buttonsLayout?: 'grouped' | 'separate';

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
  buttonsLayout = 'grouped',
  menuItems = [],
  zIndex = 10,
}) => {
  const hasRightContent = buttons.length > 0 || menuItems.length > 0 || onClose;

  const Buttons = (
    <>
      {buttons.map((button, index) => {
        const enabled = button.enabled ?? true;

        // Icon-only button
        if (button.icon && button.iconOnly) {
          return (
            <Tooltip
              key={index}
              label={button.label}
              transitionProps={{ transition: 'pop', duration: 300 }}
            >
              <Button
                aria-label={button.icon}
                variant="default"
                size="compact-sm"
                onClick={button.onClick}
                disabled={!enabled}
                classNames={{
                  root: classes.groupedButton,
                }}
              >
                <Icon type={button.icon} size={20} />
              </Button>
            </Tooltip>
          );
        }

        // Button with label (and optional icon)
        return (
          <Button
            key={index}
            variant="light"
            size="compact-sm"
            onClick={button.onClick}
            disabled={!enabled}
            leftSection={button.icon ? <Icon type={button.icon} size={16} /> : undefined}
            classNames={{
              root: classes.groupedButton,
            }}
          >
            {button.label}
          </Button>
        );
      })}
    </>
  );

  return (
    <Box className={classes.navigation}
      style={{
        zIndex,
      }}
    >
      {/* Left slot */}
      <Group justify="flex-start" gap="xs" className={classes.leftSlot}>
        {onBack ? (
          <ActionIcon
            aria-label={backLabel}
            variant="light"
            size="lg"
            radius="xl"
            onClick={onBack}
            classNames={classes.backButton}
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
        className={classes.title}
      >
        {title}
      </Text>

      {/* Right slot */}
      <Group justify="flex-end" gap="xs" className={classes.rightSlot}>
        {/* Button group */}
        {buttons.length > 0 && (
          <>
            {buttonsLayout === 'grouped' && (
              <Button.Group className={classes.buttonGroup}>
                {Buttons}
              </Button.Group>
            )}
            {buttonsLayout === 'separate' && (
              <Flex gap={4} className={classes.buttonGroup}>
                {Buttons}
              </Flex>
            )}
          </>
        )}

        {/* Menu button */}
        {menuItems.length > 0 && (
          <Menu position="bottom-end" withinPortal className={classes.menu}>
            <Menu.Target>
              <ActionIcon
                aria-label="Options"
                variant="light"
                size="lg"
                radius="xl"
              >
                <Icon type="more" size={20} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown styles={{
              dropdown: {
                borderRadius: 8,
              },
            }}>
              {menuItems.map((item, index) => (
                <Menu.Item style={{
                  borderRadius: 4,
                }}
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
            className={classes.closeButton}
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
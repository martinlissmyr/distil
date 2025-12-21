// src/components/common/SettingsGroup.tsx
import React from 'react';
import {
  Box,
  Group,
  Text,
  Switch,
  Select,
  TextInput,
  PasswordInput,
  UnstyledButton,
  Flex,
  Button,
} from '@mantine/core';
import classes from './SettingsGroup.module.scss';
import { Icon } from './Icon';

export type SettingItemType =
  | 'info'
  | 'text'
  | 'select'
  | 'toggle'
  | 'navigation'
  | 'button';

export type BaseSettingItem = {
  id: string;
  label: string;

  /** optional left-side icon */
  iconType?: Parameters<typeof Icon>[0]['type'];

  /** optional right-side helper/secondary text (e.g. “In Full Screen Only”) */
  rightText?: string;

  disabled?: boolean;
};

export type InfoSettingItem = BaseSettingItem & {
  type: 'info';
  value: React.ReactNode;
};

export type TextSettingItem = BaseSettingItem & {
  type: 'text';
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;

  /**
   * If true, renders a PasswordInput (masked) but styled like the normal unstyled input.
   */
  masked?: boolean;
};

export type SelectSettingItem = BaseSettingItem & {
  type: 'select';
  value: string | null;
  placeholder?: string;
  data: { value: string; label: string }[];
  onChange: (value: string | null) => void;
};

export type ToggleSettingItem = BaseSettingItem & {
  type: 'toggle';
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export type NavigationSettingItem = BaseSettingItem & {
  type: 'navigation';
  onClick: () => void;
};

export type ButtonSettingItem = BaseSettingItem & {
  type: 'button';

  /** Optional small left-side row label, like “A login password has been set…” */
  rowLabel?: string;

  /** Button label on the right, e.g. “Change…” */
  buttonLabel: string;

  onClick: () => void;

  /** Optional button styling */
  buttonVariant?: React.ComponentProps<typeof Button>['variant']; // default: "subtle"
  buttonColor?: React.ComponentProps<typeof Button>['color']; // optional
};

export type SettingItem =
  | InfoSettingItem
  | TextSettingItem
  | SelectSettingItem
  | ToggleSettingItem
  | NavigationSettingItem
  | ButtonSettingItem;

export type SettingsGroupProps = {
  items: SettingItem[];
  /** Optional group-level aria label if you don’t have a visible header */
  ariaLabel?: string;
  /** Disables all interactive items in the group */
  disabled?: boolean;
};

export const SettingsGroupLabel = ({ label, description }) => {
  return (
    <Box px={12}>
      {label && (
        <Box>
          <Text size="sm" fw={600}>
            {label}
          </Text>
        </Box>
      )}
      {description && (
        <Box mt="2">
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  items,
  ariaLabel,
  disabled = false,
}) => {
  if (!items.length) return null;

  const showSeparators = items.length > 1;

  return (
    <Box className={classes.group} role="group" aria-label={ariaLabel}>
      {items.map((item, idx) => {
        const effectiveDisabled = disabled || !!item.disabled;

        return (
          <React.Fragment key={item.id}>
            <SettingRow item={item} disabled={effectiveDisabled} />
            {showSeparators && idx < items.length - 1 ? (
              <div className={classes.separator} />
            ) : null}
          </React.Fragment>
        );
      })}
    </Box>
  );
};

const SettingRow: React.FC<{ item: SettingItem; disabled?: boolean }> = ({
  item,
  disabled = false,
}) => {
  const leftIcon = item.iconType ? (
    <div className={classes.leftIcon}>
      <Icon type={item.iconType} size={20} />
    </div>
  ) : null;

  const leftLabel = (
    <Text size="sm" className={classes.label} fw={500}>
      {item.label}
    </Text>
  );

  const right = <RightSide item={item} disabled={disabled} />;

  if (item.type === 'navigation') {
    return (
      <UnstyledButton
        className={classes.rowButton}
        onClick={disabled ? undefined : item.onClick}
        disabled={disabled}
      >
        <Group className={classes.row} wrap="nowrap" justify="space-between">
          <Group className={classes.left} wrap="nowrap" gap="sm">
            {leftIcon}
            {leftLabel}
          </Group>
          <Group className={classes.right} wrap="nowrap" gap="sm">
            {item.rightText ? (
              <Text className={classes.rightText} c="dimmed">
                {item.rightText}
              </Text>
            ) : null}
            <div className={classes.navChevron}>
              <Icon type="forward" size={18} />
            </div>
          </Group>
        </Group>
      </UnstyledButton>
    );
  }

  return (
    <Flex className={classes.row} wrap="nowrap" justify="space-between">
      <Group className={classes.left} wrap="nowrap" gap="sm">
        {leftIcon}
        {leftLabel}
      </Group>

      <Group
        className={classes.right}
        wrap="nowrap"
        gap="sm"
        align="center"
        justify="flex-end"
        style={{
          minHeight: '40px',
        }}
      >
        {right}
      </Group>
    </Flex>
  );
};

const RightSide: React.FC<{ item: SettingItem; disabled?: boolean }> = ({
  item,
  disabled = false,
}) => {
  switch (item.type) {
    case 'info':
      return (
        <Text className={classes.rightText} c="dimmed">
          {item.value}
        </Text>
      );

    case 'text': {
      const common = {
        value: item.value,
        placeholder: item.placeholder,
        disabled,
        variant: 'unstyled' as const,
        autoComplete: 'off',
      };

      return item.masked ? (
        <PasswordInput
          {...common}
          onChange={(e) => item.onChange(e.currentTarget.value)}
          classNames={{
            root: classes.unstyledInputRoot,
            innerInput: classes.unstyledInput,
          }}
        />
      ) : (
        <TextInput
          {...common}
          onChange={(e) => item.onChange(e.currentTarget.value)}
          classNames={{
            root: classes.unstyledInputRoot,
            input: classes.unstyledInput,
          }}
        />
      );
    }

    case 'select':
      return (
        <Select
          value={item.value}
          placeholder={item.placeholder}
          data={item.data}
          onChange={item.onChange}
          disabled={disabled}
          variant="unstyled"
          rightSection={<Icon type="forward" size={16} style={{ opacity: 0.5 }} />}
          classNames={{
            input: classes.unstyledInput,
            dropdown: classes.dropdown,
            option: classes.option,
          }}
        />
      );

    case 'toggle':
      return (
        <Switch
          checked={item.checked}
          onChange={(e) => item.onChange(e.currentTarget.checked)}
          disabled={disabled}
          size="md"
          styles={{
            track: { cursor: disabled ? 'not-allowed' : 'pointer' },
          }}
        />
      );

    case 'button': {
      const btn = item as ButtonSettingItem;
      return (
        <Button
          variant={btn.buttonVariant ?? 'light'}
          color={btn.buttonColor}
          size={"compact-xs"}
          radius="sm"
          onClick={disabled ? undefined : btn.onClick}
          disabled={disabled}
        >
          {btn.buttonLabel}
        </Button>
      );
    }

    case 'navigation':
      return null;
  }
};
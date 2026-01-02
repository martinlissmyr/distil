// src/ui/common/SettingsGroup.tsx
import React from 'react';
import {
  Box,
  Group,
  Text,
  Switch,
  Select,
  TextInput,
  PasswordInput,
  Textarea,
  UnstyledButton,
  Flex,
  Button,
  Tooltip,
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

export type ValidationState = 'ok' | 'error' | 'empty' | 'unknown';

export type ValidationResult = {
  state: ValidationState;
  text?: string; // tooltip text
};

type TextItemBase = BaseSettingItem & {
  type: 'text';
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;

  /**
   * Optional: triggered when this input is focused and the user presses Cmd+Enter
   * (also supports Ctrl+Enter on non-mac keyboards).
   */
  onCmdEnter?: () => void | Promise<void>;

  /** Optional validation callback. If provided, always shows status icon. */
  validate?: (value: string) => ValidationResult;
};

export type TextSettingItem =
  | (TextItemBase & {
      multiline?: false;
      /**
       * If true, renders a PasswordInput (masked) but styled like the normal unstyled input.
       * (only valid for single-line)
       */
      masked?: boolean;
    })
  | (TextItemBase & {
      multiline: true;
      /** Textarea autosize controls */
      masked?: never;
    });

export type SelectSettingItem = BaseSettingItem & {
  type: 'select';
  value: string | null;
  placeholder?: string;
  data: { value: string; label: string }[];
  onChange: (value: string | null) => void;
  autoFocus?: boolean;
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
          <Group
            className={classes.right}
            flex={1}
            justify="flex-end"
            align="center"
            wrap="nowrap"
            gap="sm"
          >
            {item.rightText ? (
              <Text size="sm" className={classes.rightText} c="dimmed">
                {item.rightText}
              </Text>
            ) : null}
            <Flex
              align="center"
              className={classes.navChevron}
              style={{ minHeight: '40px' }}
            >
              <Icon type="forward" size={28} />
            </Flex>
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
        style={{ minHeight: '40px' }}
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
      const t = item as TextSettingItem;

      const focusProps = t.autoFocus
        ? ({ autoFocus: true, 'data-autofocus': true } as const)
        : {};

      const handleKeyDown: React.KeyboardEventHandler<
        HTMLInputElement | HTMLTextAreaElement
      > = async (e) => {
        if (disabled) return;
        if (!t.onCmdEnter) return;

        // Don’t trigger while composing (IME)
        // (nativeEvent.isComposing exists on KeyboardEvent)
        // @ts-expect-error - isComposing exists at runtime
        if (e.nativeEvent?.isComposing) return;

        const isEnter = e.key === 'Enter';
        const isCmdOrCtrl = e.metaKey || e.ctrlKey;

        if (isEnter && isCmdOrCtrl) {
          e.preventDefault();
          e.stopPropagation();
          await t.onCmdEnter();
        }
      };

      const common = {
        value: t.value,
        placeholder: t.placeholder,
        disabled,
        variant: 'unstyled' as const,
        autoComplete: 'off',
        onKeyDown: handleKeyDown,
      };

      const input = t.multiline ? (
        <Textarea
          {...common}
          {...focusProps}
          autosize
          minRows={1}
          onChange={(e) => t.onChange(e.currentTarget.value)}
          radius={0}
          classNames={{
            root: classes.unstyledInputRoot,
            input: classes.unstyledTextarea,
          }}
        />
      ) : t.masked ? (
        <PasswordInput
          {...common}
          // PasswordInput doesn't always forward unknown props to the <input>.
          // inputProps is the safe place for autofocus/data-autofocus AND key handling.
          inputProps={{
            ...focusProps,
            onKeyDown: handleKeyDown,
          }}
          onChange={(e) => t.onChange(e.currentTarget.value)}
          radius={0}
          classNames={{
            root: classes.unstyledInputRoot,
            innerInput: classes.unstyledInput,
          }}
        />
      ) : (
        <TextInput
          {...common}
          {...focusProps}
          onChange={(e) => t.onChange(e.currentTarget.value)}
          radius={0}
          classNames={{
            root: classes.unstyledInputRoot,
            input: classes.unstyledInput,
          }}
        />
      );

      // ---- validation handling ----
      const hasValidate = typeof t.validate === 'function';

      const validation = (() => {
        if (!hasValidate) return null;

        const v = String(t.value ?? '');
        if (!v.trim()) return { state: 'empty' as const };

        try {
          const res = t.validate!(v);
          if (!res || typeof res !== 'object' || !('state' in res)) {
            return { state: 'unknown' as const };
          }
          return res;
        } catch (e) {
          return {
            state: 'error' as const,
            text: e instanceof Error ? e.message : 'Validation failed',
          };
        }
      })();

      const iconSpec = (() => {
        if (!hasValidate) return null;

        if (
          !validation ||
          validation.state === 'empty' ||
          validation.state === 'unknown'
        ) {
          return { type: 'validationEmpty' as const, color: undefined };
        }
        if (validation.state === 'ok') {
          return { type: 'validationOk' as const, color: 'green' as const };
        }
        if (validation.state === 'error') {
          return { type: 'validationError' as const, color: 'red' as const };
        }
        return { type: 'validationEmpty' as const, color: undefined };
      })();

      const iconNode = iconSpec ? (
        <Box
          className={classes.validationIcon}
          aria-label={validation?.text || validation?.state || 'Validation'}
          c={iconSpec.color}
          style={{ opacity: iconSpec.type === 'validationEmpty' ? 0.5 : 1 }}
        >
          <Icon type={iconSpec.type} size={18} />
        </Box>
      ) : null;

      const iconWithTooltip =
        iconNode && validation?.text ? (
          <Tooltip
            label={validation.text}
            withArrow
            position="left"
            withinPortal
            openDelay={150}
          >
            {iconNode}
          </Tooltip>
        ) : (
          iconNode
        );

      return (
        <Group
          wrap="nowrap"
          gap={8}
          align="center"
          className={classes.rightGroup}
        >
          {input}
          {iconWithTooltip}
        </Group>
      );
    }

    case 'select': {
      const s = item as SelectSettingItem;
      const focusProps = s.autoFocus
        ? ({ autoFocus: true, 'data-autofocus': true } as const)
        : {};

      return (
        <Select
          key={s.id}
          value={s.value}
          placeholder={s.placeholder}
          data={s.data}
          onChange={s.onChange}
          disabled={disabled}
          variant="unstyled"
          allowDeselect={false}
          clearable={false}
          {...focusProps}
          comboboxProps={{
            dropdownPadding: 6,
            radius: 12,
          }}
          classNames={{
            root: classes.selectRoot,
            input: classes.unstyledInput,
            dropdown: classes.dropdown,
            option: classes.option,
          }}
        />
      );
    }

    case 'toggle': {
      const t = item as ToggleSettingItem;
      return (
        <Switch
          checked={t.checked}
          onChange={(e) => t.onChange(e.currentTarget.checked)}
          disabled={disabled}
          size="md"
          styles={{
            track: { cursor: disabled ? 'not-allowed' : 'pointer' },
          }}
        />
      );
    }

    case 'button': {
      const btn = item as ButtonSettingItem;
      return (
        <Button
          variant={btn.buttonVariant ?? 'light'}
          color={btn.buttonColor}
          size="compact-xs"
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
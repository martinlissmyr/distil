// src/helpers/nestedObjectUtils.ts

/**
 * Utilities for working with nested object paths using dot notation.
 * For Zod schema helpers, see zodHelpers.ts.
 */

/**
 * Gets a nested value from an object using dot-notation path.
 *
 * @example
 * getNestedValue({ a: { b: { c: 42 } } }, 'a.b.c') // returns 42
 * getNestedValue({ a: { b: null } }, 'a.b.c') // returns undefined
 *
 * @param obj - The object to traverse
 * @param path - Dot-notation path (e.g., 'identity.name')
 * @returns The value at the path, or undefined if not found
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Sets a nested value in an object using dot-notation path.
 * Creates intermediate objects as needed.
 * Returns a shallow copy of the root object with the updated value.
 *
 * @example
 * setNestedValue({}, 'a.b.c', 42) // returns { a: { b: { c: 42 } } }
 * setNestedValue({ a: { x: 1 } }, 'a.b', 2) // returns { a: { x: 1, b: 2 } }
 *
 * @param obj - The object to update
 * @param path - Dot-notation path (e.g., 'identity.name')
 * @param value - The value to set
 * @returns A shallow copy of the root object with the updated nested value
 */
export function setNestedValue(obj: any, path: string, value: any): any {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj);
  target[lastKey] = value;
  return { ...obj };
}

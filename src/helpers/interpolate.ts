// src/helpers/interpolate.ts
/**
 * Simple template interpolator
 * Supports:
 * - {{variable}} - simple variable replacement
 * - {{#if variable}}...{{/if}} - conditional blocks
 * - {{#if !variable}}...{{/if}} - negation with !
 * - {{#if var1 && var2}}...{{/if}} - AND conditions with &&
 */
export function interpolate(template: string, vars: Record<string, any>): string {
  let result = template;

  // Handle conditional blocks: {{#if expression}}...{{/if}}
  // Also capture leading and trailing newlines to remove them when condition is false
  result = result.replace(
    /(\n?)\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}(\n?)/g,
    (_match, leadingNewline, expression, content, _trailingNewline) => {
      const condition = evaluateCondition(expression.trim(), vars);
      if (condition) {
        // Keep the content and the leading newline
        return leadingNewline + content;
      } else {
        // Remove everything including leading and trailing newlines
        return '';
      }
    }
  );

  // Handle simple variables: {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value !== undefined && value !== null ? formatValue(value) : '';
  });

  // Collapse multiple consecutive blank lines into a single blank line
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return result;
}

/**
 * Formats a value for insertion into a template.
 * - Strings: returned as-is
 * - Numbers/Booleans: converted to string
 * - Arrays: joined with ', '
 * - Objects: JSON.stringify with formatting
 */
function formatValue(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

/**
 * Evaluate a conditional expression
 * Supports: variable, !variable, var1 && var2, !var1 && var2, etc.
 */
function evaluateCondition(expression: string, vars: Record<string, any>): boolean {
  // Split by && operator
  const andParts = expression.split('&&').map(part => part.trim());

  // All parts must be true for the whole expression to be true
  return andParts.every(part => {
    // Check for negation
    if (part.startsWith('!')) {
      const varName = part.slice(1).trim();
      return !isTruthy(vars[varName]);
    }

    // Simple variable check
    return isTruthy(vars[part]);
  });
}

/**
 * Check if a value is truthy
 */
function isTruthy(value: any): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  return true;
}
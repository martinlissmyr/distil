// src/helpers/interpolate.ts
/**
 * Simple template interpolator
 * Supports:
 * - {{variable}} - simple variable replacement
 * - {{#if expression}}...{{/if}} - conditional blocks (nested supported)
 * - expressions support:
 *    - variable
 *    - !variable
 *    - var1 && var2
 */
type HasContentResolver = (key: string) => boolean;
type InterpolationValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | InterpolationValue[]
  | { [key: string]: InterpolationValue };
type InterpolationVars = Record<string, InterpolationValue>;

export function interpolate(
  template: string,
  vars: InterpolationVars,
  resolveHasContent?: HasContentResolver
): string {
  const ast = parseTemplate(template);
  let result = renderNodes(ast, vars, resolveHasContent);

  // Collapse multiple consecutive blank lines into a single blank line
  result = result.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return result;
}

// ---------------------------------------------------------------------------
// AST
// ---------------------------------------------------------------------------

type Node =
  | { type: 'text'; value: string }
  | { type: 'var'; key: string }
  | { type: 'if'; expr: string; children: Node[] };

function parseTemplate(input: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ expr: string; children: Node[] }> = [];
  const tokenRe = /\{\{#if\s+([^}]+)\}\}|\{\{\/if\}\}|\{\{(\w+)\}\}/g;

  let lastIndex = 0;
  let m: RegExpExecArray | null;

  const pushNode = (node: Node) => {
    if (stack.length > 0) stack[stack.length - 1]!.children.push(node);
    else root.push(node);
  };

  while ((m = tokenRe.exec(input)) !== null) {
    const idx = m.index;

    if (idx > lastIndex) {
      pushNode({ type: 'text', value: input.slice(lastIndex, idx) });
    }

    if (m[1] != null) {
      stack.push({ expr: m[1].trim(), children: [] });
    } else if (m[0] === '{{/if}}') {
      const block = stack.pop();
      if (!block) pushNode({ type: 'text', value: m[0] });
      else pushNode({ type: 'if', expr: block.expr, children: block.children });
    } else if (m[2] != null) {
      pushNode({ type: 'var', key: m[2] });
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < input.length) {
    pushNode({ type: 'text', value: input.slice(lastIndex) });
  }

  // ✅ IMPORTANT: don't render here (no vars/resolver available reliably).
  // Fail-soft by re-emitting the raw markup literally.
  while (stack.length > 0) {
    const block = stack.shift()!;
    root.push({
      type: 'text',
      value: `{{#if ${block.expr}}}${stringifyNodesAsLiteral(block.children)}{{/if}}`,
    });
  }

  return root;
}

function stringifyNodesAsLiteral(nodes: Node[]): string {
  // Preserve original-ish text when unbalanced.
  // We can't perfectly reconstruct, but this avoids silently "evaluating" without a resolver.
  return nodes
    .map((n) => {
      if (n.type === 'text') return n.value;
      if (n.type === 'var') return `{{${n.key}}}`;
      // nested if
      return `{{#if ${n.expr}}}${stringifyNodesAsLiteral(n.children)}{{/if}}`;
    })
    .join('');
}

function renderNodes(
  nodes: Node[],
  vars: InterpolationVars,
  resolveHasContent?: HasContentResolver
): string {
  let out = '';

  for (const n of nodes) {
    if (n.type === 'text') out += n.value;
    else if (n.type === 'var') {
      const value = vars[n.key];
      out += value !== undefined && value !== null ? formatValue(value) : '';
    } else if (n.type === 'if') {
      if (evaluateCondition(n.expr, vars, resolveHasContent)) {
        out += renderNodes(n.children, vars, resolveHasContent);
      }
    }
  }

  return out;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a value for insertion into a template.
 * - Strings: returned as-is
 * - Numbers/Booleans: converted to string
 * - Arrays: joined with ', '
 * - Objects: JSON.stringify with formatting
 */
function formatValue(value: InterpolationValue): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * Evaluate a conditional expression
 * Supports: variable, !variable, var1 && var2, !var1 && var2, etc.
 */
function evaluateCondition(
  expression: string,
  vars: InterpolationVars,
  resolveHasContent?: HasContentResolver
): boolean {
  const andParts = expression
    .split('&&')
    .map((p) => p.trim())
    .filter(Boolean);

  return andParts.every((part) => evaluateTerm(part, vars, resolveHasContent));
}

function evaluateTerm(
  part: string,
  vars: InterpolationVars,
  resolveHasContent?: HasContentResolver
): boolean {
  if (part.startsWith('!')) {
    return !evaluateTerm(part.slice(1).trim(), vars, resolveHasContent);
  }

  // hasContent(key)
  const fnMatch = part.match(/^hasContent\(\s*([a-zA-Z0-9_]+)\s*\)$/);
  if (fnMatch) {
    const key = fnMatch[1];
    if (resolveHasContent) return !!resolveHasContent(key);

    // Optional fallback if no resolver provided:
    return isTruthy(vars[key]);
  }

  // plain variable
  return isTruthy(vars[part]);
}

/**
 * Check if a value is truthy
 */
function isTruthy(value: InterpolationValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.length > 0;
  if (typeof value === 'number') return value !== 0;
  return true;
}

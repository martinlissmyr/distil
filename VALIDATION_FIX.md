# Validation Fix - Backward Compatibility

## Issue

After implementing strict input validation, the app failed to start with error:
```
Uncaught (in promise) Error: Error invoking remote method 'stories:list': Error: Invalid project ID format
```

## Root Cause

The validation was too strict, requiring project IDs to match the exact format `project-{timestamp}`. However, the user's data directory contained a legacy project with ID `"default"` which predated this naming convention.

### Existing Projects Found
```
~/Alinea/projects/
  ├── default/                   ← Legacy format
  ├── project-1763912949950/     ← New format
  └── project-1764087963334/     ← New format
```

## Solution

Updated validation functions to be more permissive while still maintaining security:

### Before (Too Strict)
```typescript
// Only accepted: "project-{digits}"
if (!/^project-\d+$/.test(id)) {
  throw new Error('Invalid project ID format');
}
```

### After (Backward Compatible)
```typescript
// Accepts: any alphanumeric ID with dashes/underscores
// Examples: "default", "project-123", "my-project_1"
if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
  throw new Error('Invalid project ID: contains invalid characters');
}
```

## Security Impact

The updated validation still provides security by:
- ✅ Blocking path traversal (`/`, `\`, `..`)
- ✅ Preventing special characters that could be dangerous
- ✅ Ensuring IDs are non-empty strings
- ✅ Only allowing alphanumeric characters, dashes, and underscores

The validation is **not weaker** from a security perspective - it just accepts more legitimate ID formats.

## Changes Made

**File: `electron/validation.ts`**
- Updated `validateProjectId()` to accept alphanumeric + dash + underscore
- Updated `validateStoryId()` to accept alphanumeric + dash + underscore
- Added comments explaining backward compatibility

## Testing

The app should now:
- ✅ Start successfully with existing "default" project
- ✅ Load stories from legacy projects
- ✅ Still reject malicious IDs (path traversal attempts)
- ✅ Continue to work with newly created projects

## Future Considerations

If you want to enforce strict naming for **new** projects while supporting legacy ones, you could:

1. Add a migration script to rename "default" → "project-{timestamp}"
2. Keep validation lenient for reads, strict for creates
3. Add a separate validation function for new project creation

For now, the permissive validation is the safest approach for backward compatibility.

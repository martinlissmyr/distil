// src/schemas/character.ts
import { z } from 'zod';
import { defineField, defineType } from './types';
import { buildZodFromSchema } from '../../../helpers/buidZodFromSchema';

export const LocationTierSchema = z.enum(['primary', 'significant', 'secondary']);

/**
 * Location document schema
 * Minimal Sanity-like schema DSL.
 */

export const locationType = defineType({
  name: 'location',
  title: 'Location',
  version: 1,
  groups: [
    {
      id: "identity",
      label: "Identity",
      description: "What do you call the location? Is it referenced to in ways other than its name? Either in the text or in the outline, brief etc?",
    },
    {
      id: "role",
      label: "Role & Significance",
      description: "Define how central this location is to the story’s core arc. Is it a common scene? Q: What does this location do for the story?",
    }
  ],
  fields: [
    // --------------------
    // Identity
    // --------------------
    defineField({
      name: 'identity.name',
      group: 'identity',
      type: 'text',
      label: 'Name',
      placeholder: 'Location name',
      schema: z.string().min(1, 'Name is required'),
    }),

    defineField({
      name: 'identity.aliases',
      group: 'identity',
      type: 'text',
      label: 'Aliases',
      placeholder: 'Location aliases, secondary names, etc.',
      schema: z.string().optional(),
    }),

    // --------------------
    // Role & Significance
    // --------------------
    defineField({
      name: 'tier',
      group: 'role',
      type: 'select',
      label: 'Importance',
      schema: LocationTierSchema.default('primary'),
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'significant', label: 'Significant' },
        { value: 'secondary', label: 'Secondary' },
      ],
    }),

    defineField({
      name: 'roleInStory',
      group: 'role',
      type: 'text',
      label: 'Narrative function',
      placeholder: 'e.g. home, office, part of a city or village where the story takes place',
      schema: z.string().optional(),
    }),
  ] as const,
});

export const LocationDocSchema = buildZodFromSchema(locationType).and(
  z.object({
    id: z.string(),
    version: z.literal(locationType.version),
    updatedAt: z.string(),
    createdAt: z.string().optional(),
  })
);

export type LocationTier = z.infer<typeof LocationTierSchema>;
export type LocationDoc = z.infer<typeof LocationDocSchema>;
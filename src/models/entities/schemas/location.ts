// src/schemas/location.ts
import { z } from 'zod';
import { defineField, defineType } from './types';
import { buildZodFromSchema } from '../../../helpers/buildZodFromSchema';

export const LocationTierSchema = z.enum(['primary', 'significant', 'secondary']);

export const locationType = defineType({
  name: 'location',
  title: 'Location',
  version: 2,
  groups: [
    {
      id: 'identity',
      label: 'Identity',
      description:
        'What is the place called, and how do you refer to it? Name, alternative names, and how it is recognized in the text.',
    },
    {
      id: 'role',
      label: 'Significance & Story Function',
      description:
        'How central is this location to the story, and what function does it serve? (e.g. home, meeting place, hotspot, safe zone).',
    },
  ] as const,

  fields: [
    // --------------------
    // Identity
    // --------------------
    defineField({
      name: 'name',
      fieldRole: 'primaryTitle',
      group: 'identity',
      type: 'text',
      label: 'Name',
      placeholder: 'Name of the location',
      schema: z.string().min(1, 'Name is required'),
      includeInProjection: true,
    }),

    defineField({
      name: 'aliases',
      group: 'identity',
      type: 'text',
      label: 'Aliases',
      placeholder: 'Alternative names, nicknames, local terms',
      schema: z.string().optional(),
      includeInProjection: true,
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
      includeInProjection: true,
    }),

    defineField({
      name: 'roleInStory',
      group: 'role',
      type: 'text',
      label: 'Narrative function',
      placeholder: 'e.g. home, transit point, conflict zone, refuge, symbolic place',
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    // --------------------
    // Place (physical + sensory)
    // --------------------
    defineField({
      name: 'placeDescription',
      type: 'textarea',
      label: 'Description (how does it look and feel?)',
      description:
        'Write for scene use: scale, form, light, materials, the pace of the space. How does it look and feel? E.g. Low stone building with sooty windows. Smell of resin and damp earth. The floorboards creak in a way that gives footsteps away. A bucket of water always stands in the corner…',
      placeholder:
        '',
      minRows: 6,
      schema: z.string().optional(),
    }),

    // --------------------
    // Social reality (rules + what goes on here)
    // --------------------
    defineField({
      name: 'socialAspects',
      type: 'textarea',
      label: 'Life in this place (who, why, what it demands)',
      description:
        'Describe how this place is lived in and used on a normal day. Who comes here, and for what reasons? Who feels at home, who is tolerated, and who does not belong? What norms, hierarchies, expectations, or pressures are present here?\n\nInclude the character-facing meaning when relevant: inherited responsibility, obligation, reputation, comfort, or tension tied to the place. This is about lived social reality and meaning — not plot structure.',
      minRows: 6,
      schema: z.string().optional(),
    }),

    // --------------------
    // Relationships
    // --------------------
    defineField({
      name: 'relationships',
      type: 'textarea',
      label: 'Connections & context (how does it relate to other locations)',
      description:
        'Describe how this place connects to other places. Use simple prefixes such as: “Inside:”, “Contains:”, “Near:”, “Connected to:”, “Leads to:”. One connection per line. Add a short note if helpful.',
      minRows: 5,
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    // --------------------
    // Associated characters
    // --------------------
    defineField({
      name: 'associatedCharacters',
      type: 'textarea',
      label: 'Associated characters',
      description:
        'Link the location to characters. Note who lives here, owns or runs it, feels safe here, or is vulnerable here. One item per line if possible. For example: “Lives here: Character X“, “Owned/runned by: Character Y“',
      placeholder:
        '',
      minRows: 5,
      schema: z.string().optional(),
      includeInProjection: true,
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
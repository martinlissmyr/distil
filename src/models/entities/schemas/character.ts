// src/schemas/character.ts
import { z } from 'zod';
import { defineField, defineType } from './types';
import { buildZodFromSchema } from '../../../helpers/buildZodFromSchema';

export const CharacterTierSchema = z.enum(['primary', 'significant', 'secondary']);

/**
 * Character document schema
 * Minimal Sanity-like schema DSL.
 */

export const characterType = defineType({
  name: 'character',
  title: 'Character',
  version: 2,
  groups: [
    {
      id: "identity",
      label: "Identity",
      description: "These are the basic traits of this character.",
    },
    {
      id: "role",
      label: "Role & Significance",
      description: "How central is this character is to the story’s core arc? What role does this character play in the story’s structure — not their personality or backstory. Q: What does this character do for the story?",
    }
  ],
  fields: [
    // --------------------
    // Identity
    // --------------------
    defineField({
      name: 'name',
      fieldRole: 'primaryTitle',
      documentRoleDescription: 'Name (primary identifier)',
      group: 'identity',
      type: 'text',
      label: 'Name',
      placeholder: 'Character name',
      schema: z.string().min(1, 'Name is required'),
      includeInProjection: true,
    }),

    defineField({
      name: 'aliases',
      documentRoleDescription: 'Aliases (nicknames or internal names)',
      group: 'identity',
      type: 'text',
      label: 'Aliases',
      placeholder: 'Nicknames, aliases or internal names you use when referring to the character',
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    defineField({
      name: 'age',
      documentRoleDescription: 'Age (actual or approximate)',
      group: 'identity',
      type: 'text',
      label: 'Age',
      placeholder: 'The characters age (actual or approximate)',
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    defineField({
      name: 'gender',
      documentRoleDescription: 'Gender (identity or self-description)',
      group: 'identity',
      type: 'text',
      label: 'Gender',
      placeholder: 'Gender identity or self-description',
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    // --------------------
    // Role & Significance
    // --------------------
    defineField({
      name: 'tier',
      documentRoleDescription: 'Importance (the significance of the character: primary, significant, secondary)',
      group: 'role',
      type: 'select',
      label: 'Importance',
      schema: CharacterTierSchema.default('primary'),
      options: [
        { value: 'primary', label: 'Primary' },
        { value: 'significant', label: 'Significant' },
        { value: 'secondary', label: 'Secondary' },
      ],
      includeInProjection: true,
    }),

    defineField({
      name: 'roleInStory',
      documentRoleDescription: 'Narrative role',
      group: 'role',
      type: 'text',
      label: 'Narrative role',
      placeholder: 'e.g. witness, catalyst, antagonist',
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    // --------------------
    // freeform fields
    // --------------------

    defineField({
      name: 'relationships',
      documentRoleDescription: 'Relationships & Dynamics (key connections with other characters)',
      type: 'textarea',
      label: 'Relationships & Dynamics',
      description: 'Key relationships, dynamics, and connections with other characters. Describe both emotional bonds and narrative functions.',
      placeholder: 'Mentor figure to X, but growing tensions over Y. Professional rivalry with Z...',
      minRows: 4,
      schema: z.string().optional(),
      includeInProjection: true,
    }),

    defineField({
      name: 'positionAndLivelihood',
      documentRoleDescription: 'Position in the world (how the character lives and is situated in their world (work, calling, social position etc))',
      type: 'textarea',
      label: 'Position in the world (livelihood, status, belonging)',
      description:
        'Describe how this character lives and is situated in their world — work or calling, social position, dependence, privilege, or marginality. Describe what shapes their everyday standing and possibilities.',
      placeholder: '',
      minRows: 4,
      wizard: 'character-position-in-the-world',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'presenceAndExpression',
      documentRoleDescription: 'Presence & Expression (how the character comes across — physically, socially, and behaviorally)',
      type: 'textarea',
      label: 'Presence & Expression (what others see and feel)',
      description:
        'How the character comes across — physically, socially, and behaviorally. Physical presence, behavioral signals, social & cultural markers etc. Q: When this character enters a room, what do others immediately notice or sense? How do the character talk or express themselves?',
      placeholder: '',
      minRows: 4,
      wizard: 'character-presence-and-expression',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'voiceSamples',
      documentRoleDescription: 'Voice & Thought Samples (how they speak or think)',
      type: 'textarea',
      label: 'Voice & Thought Samples (how they speak or think)',
      description:
        "Concrete examples of the character’s voice, inner monologue, or way of expressing themselves. This can be snippets of dialogue, fragments of thought, recurring phrases, or tonal patterns. Q: If this character spoke or thought for a few lines, what would it actually sound like?",
      placeholder: '',
      minRows: 4,
      schema: z.string().optional(),
    }),

    defineField({
      name: 'innerOrientation',
      documentRoleDescription: 'Inner orientation (what quietly guides them)',
      type: 'textarea',
      label: 'Inner orientation (what quietly guides them)',
      description:
        "What shapes the characters choices and behavior — values, morale, beliefs, longing, habit, comfort, or tension. This doesn’t have to be a problem to overcome. Q: What inner direction shapes this character’s choices, even when they’re not aware of it?",
      placeholder: '',
      minRows: 4,
      wizard: 'character-inner-orientation',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'externalConstraints',
      documentRoleDescription: 'External constraints (forces outside the character that shape what\'s possible)',
      type: 'textarea',
      label: 'External constraints (what limits choice)',
      description:
        "Forces outside the character that shape what's possible — people, institutions, environment, obligations, social context, time, money, health, etc. Q: What circumstances, structures, or obligations narrow their range of choices?",
      placeholder: '',
      minRows: 4,
      wizard: 'character-external-constraints',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'notesAndFacts',
      documentRoleDescription: 'Other notes and facts',
      type: 'textarea',
      label: 'Other notes and facts',
      description:
        "Other facts or circumstances you want to define for you character.",
      placeholder: '',
      minRows: 4,
      schema: z.string().optional(),
    }),
  ] as const,
});

export const CharacterDocSchema = buildZodFromSchema(characterType).and(
  z.object({
    id: z.string(),
    version: z.literal(characterType.version),
    updatedAt: z.string(),
    createdAt: z.string().optional(),
  })
);

export type CharacterTier = z.infer<typeof CharacterTierSchema>;
export type CharacterDoc = z.infer<typeof CharacterDocSchema>;
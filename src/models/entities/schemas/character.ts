// src/schemas/character.ts
import { z } from 'zod';
import { defineField, defineType } from './types';
import { buildZodFromSchema } from '../../../helpers/buidZodFromSchema';

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
      name: 'identity.name',
      group: 'identity',
      type: 'text',
      label: 'Name',
      placeholder: 'Character name',
      schema: z.string().min(1, 'Name is required'),
    }),

    defineField({
      name: 'identity.aliases',
      group: 'identity',
      type: 'text',
      label: 'Aliases',
      placeholder: 'Nicknames, aliases or internal names you use when referring to the character',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'identity.age',
      group: 'identity',
      type: 'text',
      label: 'Age',
      placeholder: 'The characters age (actual or approximate)',
      schema: z.string().optional(),
    }),

    defineField({
      name: 'identity.gender',
      group: 'identity',
      type: 'text',
      label: 'Gender',
      placeholder: 'Gender identity or self-description',
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
      schema: CharacterTierSchema.default('primary'),
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
      label: 'Narrative role',
      placeholder: 'e.g. witness, catalyst, antagonist',
      schema: z.string().optional(),
    }),

    // --------------------
    // freeform fields
    // --------------------
    defineField({
      name: 'positionAndLivelihood',
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
      type: 'textarea',
      label: 'External constraints (what limits choice)',
      description:
        "Forces outside the character that shape what's possible — people, institutions, environment, obligations, social context, time, money, health, etc. Q: What circumstances, structures, or obligations narrow their range of choices?",
      placeholder: '',
      minRows: 4,
      schema: z.string().optional(),
    }),

    defineField({
      name: 'notesAndFacts',
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
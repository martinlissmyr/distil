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
      description: "What do you call the character? And does it go under any other names? Or is it referenced to in ways other than its name? Either in the text or in the outline, brief etc?",
    },
    {
      id: "role",
      label: "Role & Significance",
      description: "Choose how central this character is to the story’s core arc. This affects how much narrative focus, development, and influence the character has on the plot. And what role does this character play in the story’s structure — not their personality or backstory. Q: What does this character do for the story?",
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
      placeholder: 'Character aliases, nicknames, etc.',
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
      placeholder: 'e.g. investigator, witness, catalyst, mentor',
      schema: z.string().optional(),
    }),

    // --------------------
    // Body (freeform fields)
    // --------------------
    defineField({
      name: 'presenceAndExpression',
      type: 'textarea',
      label: 'Presence & Expression (what others see and feel)',
      description:
        'How the character comes across — physically, socially, and behaviorally. Physical presence, behavioral signals, social & cultural markers etc. Q: When this character enters a room, what do others immediately notice or sense?',
      placeholder: '',
      minRows: 4,
      schema: z.string().optional(),
    }),

    defineField({
      name: 'voiceSamples',
      type: 'textarea',
      label: 'Voice & Thought Samples (how they speak or think)',
      description:
        "Concrete examples of the character’s voice, inner monologue, or way of expressing themselves. This can be snippets of dialogue, fragments of thought, recurring phrases, or tonal patterns — not to lock the character into fixed lines, but to capture their rhythm, register, and attitude in language. Q: If this character spoke or thought for a few lines, what would it actually sound like?",
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
      schema: z.string().optional(),
    }),

    defineField({
      name: 'sensitivityAndPull',
      type: 'textarea',
      label: 'Sensitivity & pull (what affects the character most)',
      description:
        'Situations, topics, or dynamics that reliably draw them in or make them withdraw or react — including triggers, avoids, soft spots, and temptations. Q: What do they react strongly to, for better or worse?',
      placeholder: '',
      minRows: 4,
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
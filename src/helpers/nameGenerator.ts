// src/helpers/nameGenerator.ts

const ADJECTIVES = [
  'Silent',
  'Hidden',
  'Crimson',
  'Ancient',
  'Wandering',
  'Fading',
  'Golden',
  'Restless',
  'Forgotten',
  'Lonely',
  'Burning',
  'Shattered',
  'Midnight',
  'Echoing',
  'Wild',
  'Hollow',
  'Endless',
  'Quiet',
];

const PROJECT_NOUNS = [
  'Forest',
  'River',
  'Archive',
  'Journey',
  'World',
  'Labyrinth',
  'Chronicle',
  'Garden',
  'Library',
  'Frontier',
];

const STORY_NOUNS = [
  'Moon',
  'Shadow',
  'Dream',
  'Fire',
  'Voice',
  'Storm',
  'Memory',
  'Path',
  'Night',
  'Star',
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateProjectName(): string {
  return `${pick(ADJECTIVES)} ${pick(PROJECT_NOUNS)}`;
}

export function generateStoryTitle(): string {
  return `${pick(ADJECTIVES)} ${pick(STORY_NOUNS)}`;
}
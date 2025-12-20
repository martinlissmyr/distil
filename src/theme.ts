import { createTheme, mergeMantineTheme } from '@mantine/core';

const base = createTheme({
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  defaultRadius: 'xl',
  primaryShade: { light: 5, dark: 5 },
});

export const defaultTheme = mergeMantineTheme(
  base,
  createTheme({
    primaryColor: 'gray',
    white: '#ffffff',
    black: '#0f1115',

    colors: {
      /**
       * Neutral “UI gray” scale for light mode.
       * 0 = lightest surface, 9 = deepest neutral.
       */
      gray: [
        '#F8FAFC', // 0 – page highlight
        '#F1F5F9', // 1 – subtle surface
        '#E2E8F0', // 2 – borders / separators
        '#CBD5E1', // 3 – stronger border
        '#94A3B8', // 4 – muted text/icon
        '#64748B', // 5 – secondary text
        '#475569', // 6 – strong secondary
        '#334155', // 7 – deep slate
        '#1F2937', // 8 – near-black UI
        '#0F172A', // 9 – deepest (rarely used in light mode)
      ],

      /**
       * “dark” scale only matters when the color scheme is dark,
       * but define it anyway so default mode can safely switch schemes.
       * Here it’s a neutral charcoal (not brown, not blue).
       */
      dark: [
        '#E6EAF0', // 0 – text-ish in dark mode
        '#C9D0DA',
        '#AAB4C2',
        '#7B8798',
        '#556273',
        '#3C4653',
        '#2B333D',
        '#1F252D',
        '#161B22',
        '#0F1318',
      ],
    },
  })
);

export const metaTheme = mergeMantineTheme(
  base,
  createTheme({
    primaryColor: 'orangeWarm',
    white: '#efefef',
    black: '#1a1715',
    colors: {
      orangeWarm: [
        '#F2E8DF', // 0 – warm parchment highlight (not white)
        '#E6D4C2', // 1 – soft warm surface accent
        '#D4B896', // 2 – muted sand
        '#C49A6A', // 3 – warm ochre
        '#B57D45', // 4 – burnt amber
        '#A66124', // 5 – core accent (primary orange)
        '#8C4F18', // 6 – deep rust
        '#6E3D12', // 7 – dark umber
        '#4D2B0C', // 8 – near-background accent
        '#2F1C0A', // 9 – deepest tone (almost merges with bg)
      ],

      // 👇 key part: make "dark" match your warm-brown UI
      dark: [
        '#F2E8DF', // text-ish
        '#E6D4C2',
        '#D4B896',
        '#8A7767',
        '#5A4A40',
        '#3A2F29',
        '#2B231E',
        '#241D18',
        '#1E1814', // your body bg neighborhood
        '#16110E',
      ],
    },
  })
);

export const proseTheme = mergeMantineTheme(
  base,
  createTheme({
    // Primary accent for prose mode
    primaryColor: 'inkBlue',

    white: '#E9EDF3',
    black: '#0B1020',

    colors: {
      /**
       * Ink / night-writing blue
       * Used for primary buttons, active states, focus rings
       */
      inkBlue: [
        '#EEF3FA', // 0 – near-white highlight
        '#DCE6F2', // 1 – soft surface
        '#BFCFE6', // 2 – muted panel
        '#9BB4D8', // 3 – soft accent
        '#6F92C4', // 4 – readable accent
        '#4E73AE', // 5 – primary blue
        '#3C5C8E', // 6 – deep ink
        '#2D466C', // 7 – darker ink
        '#1F324D', // 8 – near-bg accent
        '#132236', // 9 – deepest tone
      ],

      /**
       * Dark scale mapped to your prose background
       * This is the *critical* part: Mantine hover/overlays
       * pull from `dark[]`, not primaryColor.
       */
      dark: [
        '#E6EBF2', // 0 – main text
        '#C8D2E0',
        '#A9B8CC',
        '#7E90AA',
        '#5C6F89',
        '#3F5066',
        '#2E3D52',
        '#222E40',
        '#161F30', // ≈ bg neighborhood
        '#101827', // exact prose bg
      ],
    },
  })
);

/**
 * DOCX Style Definitions
 *
 * Defines paragraph and text styles for manuscript export.
 * All measurements follow Word/OOXML conventions:
 * - Font size: half-points (24 = 12pt)
 * - Spacing: twips (twentieths of a point, 240 = 12pt)
 * - Line height: 240ths of a line when using AUTO rule (240 = single, 360 = 1.5, 480 = double)
 * - Indent: twips (1440 = 1 inch, 720 = 0.5 inch)
 */

import {
  IParagraphStyleOptions,
  AlignmentType,
  LineRuleType,
  IStylesOptions,
} from 'docx';

/**
 * Manuscript paragraph styles
 */
export const manuscriptStyles: IParagraphStyleOptions[] = [
  // Body Text - Standard paragraph style with first-line indent
  {
    id: 'BodyText',
    name: 'Body Text',
    basedOn: 'Normal',
    quickFormat: true,
    run: {
      font: 'Source Serif Pro',
      size: 24,          // 12pt
    },
    paragraph: {
      alignment: AlignmentType.JUSTIFIED,
      spacing: {
        line: 420,       // ≈ 1.75 lines (420/240 = 1.75)
        lineRule: LineRuleType.AUTO,
        after: 80,       // ≈ 4pt (80/20 = 4)
      },
      indent: {
        firstLine: 450,  // ≈ 0.3 cm / ~1.5 em feel
      },
    },
  },

  // Body Text (First) - First paragraph after heading, no indent
  {
    id: 'BodyTextFirst',
    name: 'Body Text (First)',
    basedOn: 'BodyText',
    paragraph: {
      indent: { firstLine: 0 },
    },
  },

  // Heading 1 - Part titles
  {
    id: 'Heading1',
    name: 'Heading 1',
    basedOn: 'Normal',
    next: 'BodyText',
    quickFormat: true,
    run: {
      size: 68,          // 34pt
      bold: true,
    },
    paragraph: {
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 480,     // 24pt (480/20 = 24)
        after: 240,      // 12pt (240/20 = 12)
      },
      indent: { firstLine: 0 },
    },
  },

  // Heading 2
  {
    id: 'Heading2',
    name: 'Heading 2',
    basedOn: 'Normal',
    next: 'BodyText',
    quickFormat: true,
    run: {
      size: 36,       // 18pt
      bold: true,
    },
    paragraph: {
      alignment: AlignmentType.LEFT,
      spacing: {
        before: 360,    // 18pt (360/20 = 18)
        after: 180,     // 9pt (180/20 = 9)
      },
      indent: { firstLine: 0 },
    },
  },

  // Heading 3
  {
    id: 'Heading3',
    name: 'Heading 3',
    basedOn: 'Normal',
    next: 'BodyText',
    quickFormat: true,
    run: {
      size: 28,       // 14pt (between H2's 18pt and body's 12pt)
      bold: true,
    },
    paragraph: {
      alignment: AlignmentType.LEFT,
      spacing: {
        before: 280,    // 14pt (280/20 = 14)
        after: 140,     // 7pt (140/20 = 7)
      },
      indent: { firstLine: 0 },
    },
  },
];

/**
 * Complete styles configuration for the document
 */
export const manuscriptStylesConfig: IStylesOptions = {
  paragraphStyles: manuscriptStyles,
  default: {
    document: {
      run: {
        font: 'Times New Roman',
        size: 36,  // 18pt
      },
      paragraph: {
        spacing: {
          line: 420,  // 1.75 spacing
          lineRule: LineRuleType.AUTO,
          after: 80,  // 4pt
        },
      },
    },
  },
};

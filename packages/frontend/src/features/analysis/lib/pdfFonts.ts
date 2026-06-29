import { Font } from '@react-pdf/renderer';

// Carlito is the open-source, metric-compatible drop-in for Calibri — identical
// metrics and appearance, but freely distributable (Calibri itself is a
// proprietary Microsoft font we cannot bundle). Self-hosted from /public/fonts
// so generating the PDF needs no external network at runtime.
//
// To use the real Calibri instead, drop Calibri*.ttf into public/fonts and swap
// the `src` paths below — the family name can stay 'Carlito' or be renamed.
Font.register({
  family: 'Carlito',
  fonts: [
    { src: '/fonts/Carlito-Regular.ttf' },
    { src: '/fonts/Carlito-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/Carlito-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/Carlito-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

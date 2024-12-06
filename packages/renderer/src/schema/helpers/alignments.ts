import { Alignment } from '../../pandoc';

export const TABLE_CELL_DEFAULT_ALIGNMENT = 'default';
export const TABLE_CELL_ALIGNMENTS = [
  TABLE_CELL_DEFAULT_ALIGNMENT,
  'left',
  'center',
  'right',
];

export const ALIGNMENT_MAP: { pandoc: string; css: string | null }[] = [
  { pandoc: 'AlignDefault', css: null },
  { pandoc: 'AlignDefault', css: 'default' },
  { pandoc: 'AlignLeft', css: 'left' },
  { pandoc: 'AlignCenter', css: 'center' },
  { pandoc: 'AlignRight', css: 'right' },
];

export function pandocAlignmentToTextAlign(
  pandocAlignment: string
): string | null {
  const found = ALIGNMENT_MAP.find((i) => i.pandoc === pandocAlignment);
  return found ? found.css : null;
}

export function textAlignToPandocAlignment(
  textAlign: string | null
): Alignment {
  let retValue = 'AlignDefault';
  if (textAlign) {
    const found = ALIGNMENT_MAP.find((i) => i.css === textAlign);
    retValue = found ? found.pandoc : retValue;
  }
  return retValue as Alignment;
}

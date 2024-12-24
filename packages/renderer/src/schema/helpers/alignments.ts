import { Alignment } from '../../pandoc';

export const TABLE_CELL_DEFAULT_ALIGNMENT = 'default-left';

/** Cell alignments that inherit the alignment of the corresponding column in PandocTable colspec */
export type TableColumnAlignment = 'default-left' | 'default-right' | 'default-center'

export const TABLE_CELL_ALIGNMENTS = [
  TABLE_CELL_DEFAULT_ALIGNMENT,
  'left',
  'center',
  'right',
  'default-left',
  'default-center',
  'default-right'
];

export const ALIGNMENT_MAP: { pandoc: Alignment; css: string | null }[] = [
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
  textAlign: string | null,
  columnAlignment?: Alignment
): Alignment {
  let retValue = columnAlignment || 'AlignDefault';
  if (textAlign) {
    const found = ALIGNMENT_MAP.find((i) => i.css === textAlign);
    retValue = found ? found.pandoc : retValue;
  }
  return retValue as Alignment;
}

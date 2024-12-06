import { max } from 'lodash';
import {
  Alignment,
  ColSpec,
  TableBody,
  TableFoot,
  TableHead,
  type PandocJson,
} from '../../pandoc';
import {
  pandocAlignmentToTextAlign,
  textAlignToPandocAlignment,
} from './alignments';

/** The min frequency of an alignment in a column to set the colSpec value different from AlignDefault */
export const COLSPEC_ALIGNMENT_FREQ_THRESHOLD = 50.0;

function pandocColWidthToWidth(colWidth: PandocJson): number {
  if (colWidth.t === 'ColWidthDefault') return 0;
  else if (colWidth.t === 'ColWidth') return colWidth.c;
  throw new Error(`Wrong ColWidth: ${JSON.stringify(colWidth)}`);
}

export class PmColSpec {
  align: string = 'AlignDefault';
  colWidth: number = 0;
  constructor(align?: string, colWidth?: number) {
    this.align = align ? align : 'AlignDefault';
    this.colWidth = colWidth || 0;
  }
}

export function pmColSpecsToString(cs: PmColSpec[]) {
  return JSON.stringify(cs);
}

export function fillPmColSpecs(length: number): PmColSpec[] {
  const cs: PmColSpec[] = [];
  for (let i = 0; i < length; i++) cs.push(new PmColSpec());
  return cs;
}

export function pandocColSpecToPmColSpec(pColSpec: PandocJson[][]) {
  const colSpec: PmColSpec[] = pColSpec.map((cs) => ({
    align: cs[0].t,
    colWidth: pandocColWidthToWidth(cs[1]),
  }));
  return { colSpec: colSpec };
}

export function pmColSpecToPandoc(pmColSpec: PmColSpec[]): ColSpec[] {
  return pmColSpec.map(
    (p) => new ColSpec(textAlignToPandocAlignment(p.align), p.colWidth),
  );
}

type AlignmentFrequency = Record<Alignment, number>;
export function colAlignmentsFromSections(
  bodies: TableBody[],
  head?: TableHead,
  foot?: TableFoot,
): Alignment[] {
  let columnsPerRow: number[] = [];
  columnsPerRow = columnsPerRow
    .concat(bodies.map((body) => body.columns()))
    .concat(head ? head.columns() : [])
    .concat(foot ? foot.columns() : []);
  const maxColumns = max(columnsPerRow) || 1; //.reduce((max, c) => (c > max ? c : max), 0);
  const colAlignStat: AlignmentFrequency[] = Array(maxColumns);
  for (let i = 0; i < maxColumns; i++) {
    colAlignStat[i] = {
      AlignDefault: 0,
      AlignLeft: 0,
      AlignRight: 0,
      AlignCenter: 0,
    };
  }
  let rows = 0;
  bodies.forEach((body) => {
    body.rows.forEach((row) => {
      rows++;
      let col = 0;
      row.cells.forEach((cell) => {
        const { alignment, colspan } = cell;
        const align = alignment || 'AlignDefault';
        const span = colspan || 1;
        for (let c = 0; c < span; c++) {
          const colIndex = col + c;
          try {
            if (colIndex < colAlignStat.length)
              colAlignStat[colIndex][align] += 1 / span;
          } catch {
            console.log(colIndex);
          }
        }
        col = col + span;
      });
    });
  });
  if (rows > 0) {
    colAlignStat.forEach((stat) => {
      stat.AlignDefault /= rows;
      stat.AlignCenter /= rows;
      stat.AlignLeft /= rows;
      stat.AlignRight /= rows;
    });
  }
  const colAlignments: Alignment[] = colAlignStat.map((cs, c) => {
    let maxFreq = 0;
    let alignment: Alignment = 'AlignDefault';
    Object.entries(colAlignStat[c]).forEach(([align, freq]) => {
      if (freq > maxFreq) {
        alignment = align as Alignment;
        maxFreq = freq;
      }
    });
    return alignment;
  });
  return colAlignments;
}

export function colSpecToString(colSpec: PmColSpec): string {
  const align = colSpec.align || 'AlignDefault';
  const colWidth =
    colSpec.colWidth === 0 ? 'ColWidthDefault' : colSpec.colWidth;
  return `{align: ${align}, colWidth: ${colWidth}}`;
}

export function colSpecToCompactString(colSpec: PmColSpec): string {
  const align = pandocAlignmentToTextAlign(colSpec.align) || 'def';
  const colWidth =
    colSpec.colWidth === 0 ? 'def' : Math.round(colSpec.colWidth * 100) + '%';
  return `(${align},${colWidth})`;
}

export function pmColSpecsToPandoc(colspecs: PmColSpec[]): ColSpec[] {
  return colspecs
    ? colspecs.map(
        (cs) =>
          new ColSpec((cs.align || 'AlignDefault') as Alignment, cs.colWidth),
      )
    : [];
}

export function pmColSpecsToWidths(
  colspecs: PmColSpec[],
  tableWidth: number,
): number[] {
  let freeShare = colspecs.reduce(
    (freeshare, cs) => freeshare - cs.colWidth,
    1,
  );
  freeShare = freeShare <= 0 ? 0.1 : freeShare;
  const freeColumns = colspecs.reduce(
    (freecols, cs) => (cs.colWidth > 0 ? freecols : freecols + 1),
    0,
  );
  const freeColAutoWidth =
    freeColumns > 0 ? Math.round((freeShare * tableWidth) / freeColumns) : 0;
  return colspecs.map(({ colWidth: w }) =>
    w > 0 ? w * tableWidth : freeColAutoWidth,
  );
}

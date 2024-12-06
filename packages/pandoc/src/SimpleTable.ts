// Pandoc table v. 1.20
// see https://hackage.haskell.org/package/pandoc-types-1.20/docs/Text-Pandoc-Definition.html
// used by Pandoc 2.9.2.1 in Debian "bullseye"

import { isArray } from 'lodash';
import type { Alignment, PandocItem, Inline } from './PandocModel';
import { simpleMarkdownToInlines, Block, Plain, Para } from './PandocModel';

export class TableCell implements PandocItem {
  properties = ['content'];

  constructor(public readonly content: Block[]) {}

  static from(content: string | string[]): TableCell {
    if (isArray(content)) {
      return new TableCell(content.map((c) => Para.from(c)));
    }
    return new TableCell([Plain.from(content)]);
  }
}

export interface SimpleTableProperties {
  caption: Inline[] | string;
  colAlignments: Alignment[];
  colWidths: number[];
  headers: (TableCell | string)[];
  body: (TableCell | string)[][];
}

export class SimpleTable extends Block {
  name = 'Table';
  properties = [
    'name',
    'caption',
    'colAlignments',
    'colWidths',
    'headers',
    'body',
  ];

  constructor(
    public readonly caption: Inline[],
    public readonly colAlignments: Alignment[],
    public readonly colWidths: number[],
    public readonly headers: TableCell[],
    public readonly body: TableCell[][]
  ) {
    super();
  }

  static from(props: Partial<SimpleTableProperties>): SimpleTable {
    let caption: Inline[] = [];
    if (props.caption && typeof props.caption === 'string')
      caption = simpleMarkdownToInlines(props.caption);
    const headers: TableCell[] = (props.headers || []).map((h) => {
      if (h instanceof TableCell) {
        return h;
      } else if (typeof h === 'string') {
        return TableCell.from(h);
      } else {
        throw new Error(`Not a TableCell nor a string: "${JSON.stringify(h)}"`);
      }
    });
    const body: TableCell[][] = (props.body || []).map((row) => {
      const tcrow: TableCell[] = row.map((c) => {
        if (c instanceof TableCell) {
          return c;
        } else if (typeof c === 'string') {
          return TableCell.from(c);
        } else {
          throw new Error(
            `Not a TableCell nor a string: "${JSON.stringify(c)}"`
          );
        }
      });
      return tcrow;
    });
    return new SimpleTable(
      caption || [],
      props.colAlignments || [],
      props.colWidths || [],
      headers,
      body
    );
  }
}

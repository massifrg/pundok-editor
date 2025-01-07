import { NodeWithPos } from '@tiptap/vue-3';
import { Fragment, Node as PmNode, NodeType, Schema } from '@tiptap/pm/model';
import { CellSelection } from '@massifrg/prosemirror-tables-sections';
import { fillPmColSpecs } from './colSpec';
import { isString } from 'lodash';
import {
  TABLE_ROLE_BODY,
  TABLE_ROLE_FOOT,
  TABLE_ROLE_HEAD,
  TABLE_ROLE_TABLE
} from '../../common';

// from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-table/src/utilities/getTableNodeTypes.ts
export function getTableNodeTypes(schema: Schema): { [key: string]: NodeType } {
  if (schema.cached.tableNodeTypes) {
    return schema.cached.tableNodeTypes;
  }

  const roles: { [key: string]: NodeType } = {};

  Object.keys(schema.nodes).forEach((type) => {
    const nodeType = schema.nodes[type];

    if (nodeType.spec.tableRole) {
      roles[nodeType.spec.tableRole] = nodeType;
    }
  });

  schema.cached.tableNodeTypes = roles;

  return roles;
}

export interface PandocTableCreationOptions {
  caption?: string;
  headRowsCount?: number;
  footRowsCount?: number;
  rowHeadColumns?: number;
  cellContent?: string | Fragment | PmNode | Array<PmNode>;
  cellContainer?: 'plain' | 'paragraph';
  enumerateCells?: boolean;
}

export function createPandocTable(
  schema: Schema,
  rowsCount: number,
  colsCount: number,
  options?: PandocTableCreationOptions,
): PmNode | null {
  let caption: PmNode | undefined = undefined;
  if (options?.caption) {
    const captionText = schema.nodes.paragraph.createChecked(
      null,
      Fragment.from(schema.text(options.caption)),
    );
    caption = schema.nodes.caption.createChecked(null, captionText);
  }

  const headRows = options?.headRowsCount || 0;
  let head: PmNode | undefined = undefined;
  if (headRows > 0) {
    head = createPandocTableSection(
      schema,
      'head',
      headRows,
      colsCount,
      0,
      options?.enumerateCells,
      options?.cellContent,
      options?.cellContainer,
    );
  }

  const footRows = options?.footRowsCount || 0;
  let foot: PmNode | undefined = undefined;
  if (footRows > 0) {
    foot = createPandocTableSection(
      schema,
      'foot',
      footRows,
      colsCount,
      0,
      options?.enumerateCells,
      options?.cellContent,
      options?.cellContainer,
    );
  }

  const body = createPandocTableSection(
    schema,
    'body',
    rowsCount,
    colsCount,
    options?.rowHeadColumns || 0,
    options?.enumerateCells,
    options?.cellContent,
    options?.cellContainer,
  );

  if (!body) return null;
  const tableElements = [caption, head, body, foot].filter(
    (te) => !!te,
  ) as PmNode[];

  const colSpec = fillPmColSpecs(colsCount);

  const pandocTable = schema.nodes.pandocTable.create(
    { colSpec },
    tableElements,
  );
  return pandocTable;
}

export function createPandocTableSection(
  schema: Schema,
  sectionRole: 'body' | 'head' | 'foot',
  rowsCount: number,
  colsCount: number,
  rowHeadColumns?: number,
  enumerateCells?: boolean,
  cellContent?: string | Fragment | PmNode | Array<PmNode>,
  cellContainer?: 'plain' | 'paragraph',
): PmNode {
  const types = getTableNodeTypes(schema);
  const rows: PmNode[] = [];
  const isBody = sectionRole === 'body';
  const rhcols = rowHeadColumns || 0;
  const containerType = schema.nodes[cellContainer || 'paragraph'];
  const createCellContent = (t: string) =>
    containerType.create(null, schema.text(t));
  for (let rindex = 0; rindex < rowsCount; rindex += 1) {
    const cells: PmNode[] = [];
    for (let cindex = 0; cindex < colsCount; cindex += 1) {
      const isHeader = !isBody || (isBody && rhcols > cindex);
      const content = enumerateCells
        ? createCellContent(`${rindex + 1},${cindex + 1}`)
        : isString(cellContent)
          ? createCellContent(cellContent)
          : cellContent;
      const cellType = isHeader ? types.header_cell : types.cell;
      const cell = createCell(cellType, content);
      if (cell) cells.push(cell);
    }
    rows.push(types.row.create(null, cells));
  }
  return types[sectionRole].create({ section: sectionRole }, rows);
}

// TODO: export it from prosemirror-tables-sections
export function isTable(node: PmNode) {
  return TABLE_ROLE_TABLE == node.type.spec.tableRole;
}

// TODO: export it from prosemirror-tables-sections
export function isTableSection(node: PmNode) {
  const role = node.type.spec.tableRole;
  return role == TABLE_ROLE_BODY
    || role == TABLE_ROLE_HEAD
    || role == TABLE_ROLE_FOOT;
}

// TODO: export it from prosemirror-tables-sections
export function isTableBody(node: PmNode) {
  return TABLE_ROLE_BODY == node.type.spec.tableRole;
}

export function pandocTableSections(table: PmNode): NodeWithPos[] {
  const sections: NodeWithPos[] = [];
  if (table) {
    table.descendants((node, pos) => {
      if (isTableSection(node)) {
        sections.push({ node, pos });
        return false;
      }
      return true;
    });
  }
  return sections;
}

export function pandocTableBodies(table: PmNode): NodeWithPos[] {
  return pandocTableSections(table).filter(
    ({ node }) => node.type.spec.tableRole == 'body',
  );
}

export function pandocTableSectionRows(section: PmNode): PmNode[] {
  if (isTableSection(section)) {
    const rows: PmNode[] = [];
    for (let i = 0; i < section.childCount; i++) rows.push(section.child(i));
    return rows;
  }
  return [];
}

// from https://github.com/ueberdosis/tiptap/blob/main/packages/extension-table/src/utilities/createCell.ts
export function createCell(
  cellType: NodeType,
  cellContent?: Fragment | PmNode | Array<PmNode>,
): PmNode | null | undefined {
  if (cellContent) {
    return cellType.createChecked(null, cellContent);
  }

  return cellType.createAndFill();
}

export function isCellSelection(value: unknown): value is CellSelection {
  return value instanceof CellSelection;
}

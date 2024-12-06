import { Node, Mark } from '@tiptap/pm/model';
import { EditorState } from '@tiptap/pm/state';
import {
  parse,
  AST,
  AttributeToken,
  PseudoClassToken,
  Complex,
} from 'parsel-js';
import { SelectedNodeOrMark } from './selection';

const NORMALIZED_NAME: Record<string, string> = {
  p: 'paragraph',
  para: 'paragraph',
  header: 'heading',
  '§': 'custom-style',
};

type CombinatorSelector =
  | 'descendant'
  | 'child'
  | 'adjacent-sibling'
  | 'general-sibling';

export interface CssSelectOptions {
  mergeSameAdjacentMarks: boolean;
}

interface NodeRef {
  node: Node;
  pos: number;
  parent?: Node;
  index: number;
}

/**
 * Select `Node`s or `Mark`s in a document using CSS selectors.
 *
 * The type selectors are case insensitive and may use the internal
 * Prosemirror types' names or the names of matching Pandoc `Block`s
 * and `Inline`s.
 * @param state
 * @param selector
 * @returns
 */
export function cssSelect(
  state: EditorState,
  selector: string,
  options?: CssSelectOptions
): SelectedNodeOrMark[] {
  const doc = state.doc;
  const ast = parse(selector);
  const bases: NodeRef[] = [{ node: doc, pos: 0, index: 0 }];
  const selected = ast ? applyRule(ast, bases, 'descendant') : [];
  console.log(selected);
  return options?.mergeSameAdjacentMarks
    ? mergeAdjacentMarks(selected)
    : selected;
}

function applyRule(
  ast: AST,
  bases: NodeRef[],
  applyTo: CombinatorSelector,
  _acc?: SelectedNodeOrMark[]
): SelectedNodeOrMark[] {
  let acc: SelectedNodeOrMark[] = _acc || [];
  if (ast.type === 'complex') {
    return applyComplexRule(ast as Complex, bases, applyTo, acc);
  } else {
    return applyNotComplexRule(ast, bases, applyTo, acc);
  }
}

const combinatorToApplyTo: Record<string, CombinatorSelector> = {
  ' ': 'descendant',
  '>': 'child',
  '+': 'adjacent-sibling',
  '~': 'general-sibling',
};

function isSupportedCombinator(combinator: string) {
  return !!combinatorToApplyTo[combinator];
}

function applyComplexRule(
  complex: Complex,
  bases: NodeRef[],
  combsel: CombinatorSelector,
  _acc?: SelectedNodeOrMark[]
): SelectedNodeOrMark[] {
  const { left, right, combinator } = complex;
  if (!isSupportedCombinator(combinator))
    throw new Error(
      `combinator "${combinator}" is not supported in Complex AST`
    );
  const newBases = selectedToBases(applyRule(left, bases, combsel));
  const newCombsel = combinatorToApplyTo[combinator];
  return applyRule(right, newBases, newCombsel, _acc);
}

function selectedToBases(selected: SelectedNodeOrMark[]): NodeRef[] {
  const bases: NodeRef[] = [];
  selected.forEach((s) => {
    if (s.node)
      bases.push({
        node: s.node,
        pos: s.pos + 1,
        parent: s.parent,
        index: s.index!,
      });
  });
  return bases;
}

function applyNotComplexRule(
  ast: AST,
  bases: NodeRef[],
  combsel: CombinatorSelector,
  _acc?: SelectedNodeOrMark[]
): SelectedNodeOrMark[] {
  let acc: SelectedNodeOrMark[] = _acc || [];
  const goDeeper = combsel === 'descendant';
  switch (combsel) {
    case 'descendant':
    case 'child':
      bases.forEach(({ node: base, pos: basePos }) => {
        base.descendants((node, p, parent, index) => {
          const pos = basePos + p;
          const typeName = node.type.name;
          if (nomMatchesAST(node, ast))
            acc.push({
              name: typeName,
              node,
              pos,
              from: pos,
              to: pos + node.nodeSize,
              parent: parent || undefined,
              index,
            });
          node.marks.forEach((mark) => {
            if (nomMatchesAST(mark, ast))
              acc.push({
                name: mark.type.name,
                mark,
                pos,
                from: pos,
                to: pos + node.nodeSize,
                parent: parent || undefined,
                index,
              });
          });
          return goDeeper;
        });
      });
      break;
    case 'adjacent-sibling':
    case 'general-sibling':
      bases.forEach(({ node, pos, parent, index }) => {
        if (parent) {
          const limit =
            combsel === 'adjacent-sibling'
              ? Math.min(index + 2, parent.childCount)
              : parent.childCount;
          let curPos = pos + node.nodeSize - 1;
          for (let i = index + 1; i < limit; i++) {
            const sibling = parent.child(i);
            const nextPos = curPos + sibling.nodeSize;
            if (nomMatchesAST(sibling, ast)) {
              acc.push({
                name: sibling.type.name,
                node: sibling,
                pos: curPos,
                from: curPos,
                to: nextPos,
                parent: parent || undefined,
                index: i,
              });
            }
            curPos = nextPos;
          }
        }
      });
      break;
  }
  return acc;
}

function normalizeName(name: string): string {
  const lowered = name.toLowerCase();
  const normalized = NORMALIZED_NAME[lowered];
  return normalized || lowered;
}

function nomMatchesAST(nom: Node | Mark, ast: AST): boolean {
  switch (ast.type) {
    case 'type':
      return nomMatchesName(nom, normalizeName(ast.name));
    case 'id':
      return nomMatchesId(nom, ast.name);
    case 'class':
      return nomHasClass(nom, ast.name);
    case 'attribute':
      return nomHasAttribute(nom, normalizeName(ast.name), ast);
    case 'compound':
      return nomMatchesCompound(nom, ast.list);
    case 'list':
      return nomMatchesList(nom, ast.list);
    case 'universal':
      return true;
    case 'pseudo-class':
      return nomMatchesPseudoClass(nom, ast);
    case 'complex':
    case 'combinator':
    case 'comma':
    case 'pseudo-element':
    default:
      console.log(ast);
      throw new Error(`unknown AST type: "${ast.type}"`);
  }
  return false;
}

function nomMatchesCompound(nom: Node | Mark, list: AST[]): boolean {
  for (let i = 0; i < list.length; i++) {
    const ast = list[i];
    if (!nomMatchesAST(nom, ast)) return false;
  }
  return true;
}

function nomMatchesList(nom: Node | Mark, list: AST[]): boolean {
  for (let i = 0; i < list.length; i++) {
    const ast = list[i];
    if (nomMatchesAST(nom, ast)) return true;
  }
  return false;
}

function nomMatchesName(nom: Node | Mark, name: string): boolean {
  const typeName = nom.type.name;
  return typeName.toLowerCase() === name;
}

function nomMatchesId(nom: Node | Mark, id: string): boolean {
  return nom.attrs?.id === id;
}

function nomHasClass(nom: Node | Mark, className: string): boolean {
  if (!nom.attrs?.classes) return false;
  return nom.attrs.classes.indexOf(className) >= 0;
}

function nomHasAttribute(
  nom: Node | Mark,
  attrName: string,
  ast?: AttributeToken
): boolean {
  if (!attrName) return false;
  const attrs = nom.attrs;
  if (!attrs) return false;
  const no_attribute =
    attrs[attrName] === undefined &&
    (attrs?.kv === undefined || attrs?.kv[attrName] === undefined);
  if (!ast?.operator) return !no_attribute;
  const attrValue: string = attrs[attrName] || (attrs.kv && attrs.kv[attrName]);
  const { caseSensitive, operator, value } = ast;
  const av = caseSensitive ? attrValue : attrValue?.toLowerCase();
  const cv = caseSensitive ? value : value?.toLowerCase();
  let retValue = false;
  if (av && cv) {
    switch (operator) {
      case '=':
        retValue = av === cv;
        break;
      case '~=':
        retValue = 0 <= av.split(/ +/).findIndex((v) => v === cv);
        break;
      case '|=':
        retValue = av === cv || av.startsWith(cv + '-');
        break;
      case '^=':
        retValue = !!cv && av.startsWith(cv);
        break;
      case '$=':
        retValue = !!cv && av.endsWith(cv);
        break;
      case '*=':
        retValue = !!cv && av.indexOf(cv) >= 0;
        break;
      default:
        console.log(ast);
        throw new Error(`unknown operator "${ast.operator}" on attribute`);
    }
  }
  return retValue;
}

function nomMatchesPseudoClass(
  nom: Node | Mark,
  ast: PseudoClassToken
): boolean {
  switch (ast.name) {
    case 'not':
      return !!ast.subtree && !nomMatchesAST(nom, ast.subtree);
    default:
      console.log(ast);
      throw new Error(
        `pseudo-class ":${ast?.name}" is not known or not supported`
      );
  }
  return false;
}

export function mergeAdjacentMarks(
  selected: SelectedNodeOrMark[]
): SelectedNodeOrMark[] {
  let selMarks = selected.filter((s) => !!s.mark);
  const selNodes = selected.filter((s) => !!s.node);
  let newSelMarks: SelectedNodeOrMark[] = [];
  selMarks.sort((m1, m2) => m1.pos - m2.pos);
  while (selMarks.length > 0) {
    const firstMark = selMarks[0].mark!;
    const sameSelMarks = selMarks
      .filter((m) => m.mark!.eq(firstMark))
      .reduce((acc, sm) => {
        if (acc.length === 0) {
          acc.push(sm);
        } else {
          const prev = acc[acc.length - 1];
          if (prev.to === sm.from) {
            acc.pop();
            acc.push({
              ...prev,
              to: sm.to,
              merged: true,
            });
          } else {
            acc.push(sm);
          }
        }
        return acc;
      }, [] as SelectedNodeOrMark[]);
    newSelMarks = newSelMarks.concat(sameSelMarks);
    selMarks = selMarks.filter((m) => !m.mark!.eq(firstMark));
  }
  const newSelected = [...selNodes, ...newSelMarks];
  newSelected.sort((s1, s2) => s1.pos - s2.pos);
  return newSelected;
}

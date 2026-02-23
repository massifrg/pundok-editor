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
import { isString } from 'lodash-es';
import {
  MARK_NAME_DOUBLE_QUOTED,
  MARK_NAME_EMPH,
  MARK_NAME_SINGLE_QUOTED,
  NODE_NAME_BREAK,
  NODE_NAME_HEADING,
  NODE_NAME_HORIZONTAL_RULE,
  NODE_NAME_PARAGRAPH
} from '../../common';

type MatchNameWithNodeOrMarkFunction = (nom: Node | Mark) => boolean

const NORMALIZED_NAME: Record<string, string | MatchNameWithNodeOrMarkFunction> = {
  p: NODE_NAME_PARAGRAPH.toLowerCase(),
  para: NODE_NAME_PARAGRAPH.toLowerCase(),
  header: NODE_NAME_HEADING.toLowerCase(),
  h1: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 1,
  h2: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 2,
  h3: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 3,
  h4: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 4,
  h5: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 5,
  h6: (n) => n.type.name === NODE_NAME_HEADING && n.attrs.level === 6,
  hr: NODE_NAME_HORIZONTAL_RULE.toLowerCase(),
  '§': 'custom-style',
  br: NODE_NAME_BREAK.toLowerCase(),
  linebreak: (n) => n.type.name === NODE_NAME_BREAK && !n.attrs.soft,
  softbreak: (n) => n.type.name === NODE_NAME_BREAK && !!n.attrs.soft,
  dq: MARK_NAME_DOUBLE_QUOTED,
  sq: MARK_NAME_SINGLE_QUOTED,
  em: MARK_NAME_EMPH,
};

type CombinatorSelector =
  | 'descendant'
  | 'child'
  | 'adjacent-sibling'
  | 'general-sibling';

export interface CssSelectOptions {
  mergeSameAdjacentMarks: boolean;
  sort: boolean;
}

interface NodeRef {
  node: Node;
  pos: number;
  parent?: Node;
  index: number;
  mark?: Mark;
}

function sortSelectedNodeOrMark(snom1: SelectedNodeOrMark, snom2: SelectedNodeOrMark) {
  const fromDiff = snom1.from - snom2.from
  if (fromDiff !== 0) return fromDiff
  return snom2.to - snom1.to
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
  const refs = ast ? applyRule(ast, bases, 'descendant') : [];
  // console.log(refs);
  let selected: SelectedNodeOrMark[] = []
  refs.forEach(({ node, pos, parent, index, mark }) => {
    selected.push({
      name: mark?.type.name || node.type.name,
      node: mark ? undefined : node,
      mark,
      pos,
      from: pos,
      to: pos + node.nodeSize,
      parent,
      index
    })
  })
  selected = options?.mergeSameAdjacentMarks && mergeAdjacentMarks(selected) || selected
  selected = options?.sort && selected.sort(sortSelectedNodeOrMark) || selected
  return selected
}

function applyRule(
  ast: AST,
  bases: NodeRef[],
  applyTo: CombinatorSelector,
  _acc?: NodeRef[]
): NodeRef[] {
  let acc: NodeRef[] = _acc || [];
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
  _acc?: NodeRef[]
): NodeRef[] {
  const { left, right, combinator } = complex;
  if (!isSupportedCombinator(combinator))
    throw new Error(
      `combinator "${combinator}" is not supported in Complex AST`
    );
  const newBases = applyRule(left, bases, combsel);
  const newCombsel = combinatorToApplyTo[combinator];
  return applyRule(right, newBases, newCombsel, _acc);
}

function applyNotComplexRule(
  ast: AST,
  bases: NodeRef[],
  combsel: CombinatorSelector,
  _acc?: NodeRef[]
): NodeRef[] {
  let acc: NodeRef[] = _acc || [];
  const goDeeper = combsel === 'descendant';
  switch (combsel) {
    case 'child':
    case 'descendant':
      bases.forEach((curBase) => {
        const { node: base, mark, parent, index: parentIndex } = curBase
        const basePos = curBase.pos > 0 ? curBase.pos + 1 : 0
        if (mark) {
          const child = parent?.child(parentIndex)
          const m = child?.marks.find((m) => nomMatchesAST(m, ast, parent, parentIndex))
          if (m) acc.push({ ...curBase, mark: m })
        } else {
          base.descendants((node, p, parent, index) => {
            const pos = basePos + p;
            if (nomMatchesAST(node, ast, parent, index))
              acc.push({
                node,
                pos,
                parent: parent || undefined,
                index,
              });
            node.marks.forEach((mark) => {
              if (nomMatchesAST(mark, ast, node, index))
                acc.push({
                  mark,
                  node,
                  pos: pos,
                  parent: parent || undefined,
                  index,
                });
            });
            return goDeeper;
          });
        }
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
          let curPos = (pos > 0 ? pos + 1 : 0) + node.nodeSize - 1;
          for (let i = index + 1; i < limit; i++) {
            const sibling = parent.child(i);
            const nextPos = curPos + sibling.nodeSize;
            if (nomMatchesAST(sibling, ast, parent, index)) {
              acc.push({
                node: sibling,
                pos: curPos,
                parent: parent || undefined,
                index: i,
              });
            } else {
              const mark = sibling.marks.find(m => nomMatchesAST(m, ast, parent, index))
              if (mark) {
                acc.push({
                  mark,
                  node: sibling,
                  pos: curPos,
                  parent: parent || undefined,
                  index: i
                })
              }
            }
            curPos = nextPos;
          }
        }
      });
      break;
  }
  return acc;
}

function normalizeName(name: string, nom?: Node | Mark): string | false {
  const lowered = name.toLowerCase();
  if (!nom)
    return lowered
  const normalized = NORMALIZED_NAME[lowered];
  if (!normalized)
    return lowered
  if (isString(normalized))
    return normalized
  return normalized(nom) && nom.type.name.toLowerCase() || false
}

function nomMatchesAST(nom: Node | Mark, ast: AST, parent?: Node | null, index?: number): boolean {
  switch (ast.type) {
    case 'type': {
      return nomMatchesName(nom, ast.name);
    }
    case 'id':
      return nomMatchesId(nom, ast.name);
    case 'class':
      return nomHasClass(nom, ast.name);
    case 'attribute': {
      const normalized = normalizeName(ast.name, nom)
      return !!normalized && nomHasAttribute(nom, normalized, ast);
    }
    case 'compound':
      return nomMatchesCompound(nom, ast.list, parent, index);
    case 'list':
      return nomMatchesList(nom, ast.list, parent, index);
    case 'universal':
      return true;
    case 'pseudo-class':
      return nomMatchesPseudoClass(nom, ast, parent, index);
    case 'pseudo-element':
    case 'complex':
    case 'combinator':
    case 'comma':
    default:
      console.log(ast);
      throw new Error(`unknown AST type: "${ast.type}"`);
  }
  return false;
}

function nomMatchesCompound(nom: Node | Mark, list: AST[], parent?: Node | null, index?: number): boolean {
  for (let i = 0; i < list.length; i++) {
    const ast = list[i];
    if (!nomMatchesAST(nom, ast, parent, index)) return false;
  }
  return true;
}

function nomMatchesList(nom: Node | Mark, list: AST[], parent?: Node | null, index?: number): boolean {
  for (let i = 0; i < list.length; i++) {
    const ast = list[i];
    if (nomMatchesAST(nom, ast, parent, index)) return true;
  }
  return false;
}

function nomMatchesName(nom: Node | Mark, name: string): boolean {
  const normalized = normalizeName(name, nom) || name
  const typeName = nom.type.name;
  return typeName.toLowerCase() === normalized;
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

/**
 * Count the children of `parent` that match `nom` name in a range of indexes (extremes included).
 * @param nom 
 * @param parent 
 * @param _from starting index.
 * @param _to ending index (included).
 * @returns 
 */
function countChildrenOfType(nom: Node | Mark, parent?: Node | null, _from?: number, _to?: number): number {
  if (!parent)
    return 0
  const from = _from || 0
  const to = _to || parent.childCount - 1
  let countOfType = 0
  for (let i = from; i <= to; i++)
    if (nomMatchesName(nom, parent.child(i).type.name)) countOfType++
  return countOfType
}

function isNthOfType(nom: Node | Mark, nth: number, parent?: Node | null, index?: number): boolean {
  if (isNaN(nth) || index === undefined)
    return false
  return countChildrenOfType(nom, parent, 0, index) === nth
}

function isNthLastOfType(nom: Node | Mark, nth: number, parent?: Node | null, index?: number): boolean {
  if (isNaN(nth) || !parent || index === undefined)
    return false
  let countOfType = 0
  for (let i = index; i < parent.childCount; i++) {
    if (nomMatchesName(nom, parent.child(i).type.name)) countOfType++
    if (countOfType > nth) return false
  }
  return countOfType === nth
}

function nomMatchesPseudoClass(
  nom: Node | Mark,
  ast: PseudoClassToken,
  parent?: Node | null,
  index?: number,
): boolean {
  const { argument } = ast
  switch (ast.name) {
    case 'not':
      return !!ast.subtree && !nomMatchesAST(nom, ast.subtree);
    case 'contains':
      const n = nom instanceof Node ? nom as Node : parent
      const text = n?.textContent || n?.attrs.text
      return !!argument && text && text.indexOf(argument) >= 0
    case 'first-child':
      return index === 0
    case 'last-child':
      return !!parent && !!index && parent.childCount === index + 1
    case 'nth-child': {
      const nth = parseInt(argument || '')
      return !!index && nth === index + 1
    }
    case 'only-child':
      return !!parent && parent.childCount === 1
    case 'only-of-type': {
      return countChildrenOfType(nom, parent) === 1
    }
    case 'nth-last-child': {
      const nth = parseInt(argument || '')
      return !!parent && parent.childCount - nth === index
    }
    case 'first-of-type':
      return isNthOfType(nom, 1, parent, index)
    case 'last-of-type':
      return !!parent && isNthLastOfType(nom, 1, parent, index)
    case 'nth-of-type': {
      const nth = parseInt(argument || '')
      return isNthOfType(nom, nth, parent, index)
    }
    case 'nth-last-of-type': {
      const nth = parseInt(argument || '')
      return isNthLastOfType(nom, nth, parent, index)
    }
    case 'where':
      const types = argument?.split(',')
      return !!(types && types.find(t => nomMatchesName(nom, t)))
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

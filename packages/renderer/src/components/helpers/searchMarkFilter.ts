import type { Mark, Node, Schema } from '@tiptap/pm/model';
import type { AddableMark } from './addableMark';

export function markMatchesAddableMark(
  schema: Schema,
  mark: Mark,
  am: AddableMark,
): boolean {
  const { typeName, attrs, kind } = am.markspec
  const markType = schema.marks[typeName]
  if (!markType || mark.type !== markType) return false

  if (kind === 'style') {
    const customStyle = attrs?.customStyle || attrs?.kv?.['custom-style']
    return !!customStyle && (
      mark.attrs.customStyle === customStyle
      || mark.attrs.kv?.['custom-style'] === customStyle
    )
  }

  return mark.eq(markType.create(attrs))
}

export function rangeHasAddableMark(
  schema: Schema,
  doc: Node,
  from: number,
  to: number,
  am: AddableMark,
): boolean {
  let found = false
  doc.nodesBetween(from, to, (node) => {
    if (node.marks.some((mark) => markMatchesAddableMark(schema, mark, am)))
      found = true
    return !found
  })
  return found
}

import type { Node as ProsemirrorNode } from '@tiptap/pm/model';
import {
  INCLUDE_DOC_CLASS,
  INCLUDE_FORMAT_ATTR,
  INCLUDE_SRC_ATTR,
} from '../../schema/extensions/IncludeDivExtension';

export function documentIncludeSpecs(doc?: ProsemirrorNode): string {
  const specs: { src?: string; format?: string }[] = [];
  doc?.descendants((node) => {
    if (
      node.type.name === 'div' &&
      node.attrs?.classes?.includes(INCLUDE_DOC_CLASS)
    ) {
      specs.push({
        src: node.attrs[INCLUDE_SRC_ATTR],
        format: node.attrs[INCLUDE_FORMAT_ATTR],
      });
    }
  });
  return JSON.stringify(specs);
}

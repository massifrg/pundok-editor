import { mergeAttributes, Node } from '@tiptap/core';

const PANDOC_NULL_CLASS = 'pandoc-null';

export interface PandocNullOptions {
  HTMLAttributes: Record<string, any>
}

export const PandocNull = Node.create<PandocNullOptions>({
  name: 'pandocNull',
  atom: true,
  group: 'block',

  addOptions() {
    return {
      HTMLAttributes: {
        class: PANDOC_NULL_CLASS,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: `div.${PANDOC_NULL_CLASS}`,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 'PANDOC NULL'];
  },
});

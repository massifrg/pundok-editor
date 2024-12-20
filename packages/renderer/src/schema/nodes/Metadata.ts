import { mergeAttributes, Node } from '@tiptap/core';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { MetadataView } from '../../components';
import { Component } from 'vue';

export interface MetadataOptions {
  HTMLAttributes: Record<string, any>;
}

export const Metadata = Node.create<MetadataOptions>({
  name: 'metadata',
  content: 'metaMapEntry*',
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'metadata',
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addNodeView() {
    return VueNodeViewRenderer(MetadataView as Component);
  },
});

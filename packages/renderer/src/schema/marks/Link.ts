import {
  Link as TiptapLink,
  type LinkOptions as TiptapLinkOptions,
} from '@tiptap/extension-link';
import { mergeAttributes } from '@tiptap/vue-3';
import { SK_TOGGLE_LINK } from '../../common';

export type LinkOptions = TiptapLinkOptions;

export const Link = TiptapLink.extend<LinkOptions>({
  priority: 1000,

  addOptions() {
    return {
      openOnClick: true,
      linkOnPaste: true,
      autolink: true,
      defaultProtocol: 'http',
      protocols: [],
      HTMLAttributes: {
        // target: '_blank',
        // rel: 'noopener noreferrer nofollow',
        class: 'pandoc-link',
      },
      validate: () => true,
      isAllowedUri(url, ctx) {
        // TODO:
        return true
      },
      shouldAutoLink(url) {
        // TODO:
        return false
      },
    };
  },

  addAttributes() {
    return {
      href: {
        default: null,
      },
      target: {
        default: this.options.HTMLAttributes.target,
      },
      // class: {
      //   default: this.options.HTMLAttributes.class,
      // },
      title: {
        default: null,
        parseHTML: (e) => e.getAttribute('title') || null,
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addKeyboardShortcuts() {
    return {
      [SK_TOGGLE_LINK]: () =>
        this.editor.commands.toggleLink({ href: '#anchor' }),
    };
  },
});

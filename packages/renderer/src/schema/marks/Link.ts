import {
  Link as TiptapLink,
  type LinkOptions as TiptapLinkOptions,
} from '@tiptap/extension-link';
import { mergeAttributes } from '@tiptap/vue-3';
import { MARK_LINK_CLASS, SK } from '../../common';
import { getSpanAttrs } from '../helpers';

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
        class: MARK_LINK_CLASS,
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
        // parseHTML: (e) => e.getAttribute('title') || null,
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span',
        getAttrs: (e) => getSpanAttrs(this.name, e, this.editor?.state)
      },
      {
        tag: 'a[href]',
        getAttrs: (e) => getSpanAttrs(this.name, e, this.editor?.state)
        // getAttrs: dom => {
        //   const href = (dom as HTMLElement).getAttribute('href')
        //   // prevent XSS attacks
        //   if (
        //     !href ||
        //     !this.options.isAllowedUri(href, {
        //       defaultValidate: url => !!isAllowedUri(url, this.options.protocols),
        //       protocols: this.options.protocols,
        //       defaultProtocol: this.options.defaultProtocol,
        //     })
        //   ) {
        //     return false
        //   }
        //   return null
        // },
      },
    ]
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
      [SK.TOGGLE_LINK]: () =>
        this.editor.commands.toggleLink({ href: '#anchor' }),
    };
  },
});

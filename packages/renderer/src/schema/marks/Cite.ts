import { MarkType, Node as ProsemirrorNode } from '@tiptap/pm/model'
import {
  Mark,
  // markInputRule,
  // markPasteRule,
  mergeAttributes,
} from '@tiptap/core';
import { PundokCitation, textToCitations } from '../helpers';
import { EditorState, Transaction } from '@tiptap/pm/state';
import { Note } from '../nodes';

export interface CiteOptions {
  HTMLAttributes: Record<string, any>,
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    cite: {
      /**
       * Toggle a cite mark
       */
      toggleCite: () => ReturnType,
      /**
       * Unset a cite mark
       */
      unsetCite: () => ReturnType,
      /**
       * Fix all the Cite attributes in a Node.
       */
      fixCites: (pos?: number) => ReturnType,
    }
  }
}

// export const inputRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))$/
// export const pasteRegex = /(?:^|\s)((?:~~)((?:[^~]+))(?:~~))/g

export const Cite = Mark.create<CiteOptions>({
  name: 'cite',

  priority: 1200,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'cite'
      },
    };
  },

  addAttributes() {
    return {
      citations: {
        default: [] as PundokCitation[],
        parseHTML(element) {
          return JSON.parse(element.getAttribute('data-citations') || '[]');
        },
        renderHTML(attr) {
          return {
            'data-citations': JSON.stringify(attr.citations),
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span.cite' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      toggleCite: () => ({ dispatch, state, tr }) => {
        const { schema, selection } = state
        const citeMarkType = schema.marks[this.name]
        if (!citeMarkType) return false
        const { $from, $to, from, to, empty } = selection
        const fromNode = $from.node()
        if (empty || fromNode !== $to.node() || !fromNode.inlineContent) return false
        let citePresent = false // check whether any selected node has a Cite Mark
        let childStart = $from.start()
        let childEnd
        for (let i = 0; i < fromNode.childCount; i++) {
          const child = fromNode.child(i)
          childEnd = childStart + child.nodeSize
          console.log(`child ${i} from ${childStart} to ${childEnd}`)
          if (childEnd > from && childStart < to) {
            if (child.type.name === Note.name)
              return false
            if (!citePresent && child.marks.find(m => m.type.name === this.name))
              citePresent = true
          }
          childStart = childEnd
        }
        // TODO: don't recompute citations before this paragraph (or inline container)
        //       and fix just citationNoteNum in Cite marks in the following paragraphs.
        if (citePresent) {
          if (dispatch) {
            tr.removeMark(from, to, citeMarkType)
            fixCites(state, tr, citeMarkType, dispatch)
            dispatch(tr)
          }
        } else {
          if (dispatch) {
            const text = state.doc.textBetween(from, to)
            const citations = textToCitations(text, state, from)
            if (citations.length === 0)
              return false
            const cite = citeMarkType.create({ citations })
            if (!cite)
              return false
            tr.addMark(from, to, cite)
            fixCites(state, tr, citeMarkType, dispatch)
            dispatch(tr)
          }
        }
        return true
      },
      unsetCite: () => ({ commands }) => {
        return commands.unsetMark(this.name);
      },
      fixCites: (pos?: number) => ({ dispatch, state, tr }) => {
        const citeMarkType = state.schema.marks[this.name]
        if (!citeMarkType) return false
        const ok = fixCites(state, tr, citeMarkType, dispatch, pos)
        if (dispatch && ok) {
          dispatch(tr)
          return true
        }
        return ok
      },
    };
  },

  // addKeyboardShortcuts() {
  //   return {
  //     'Mod-k': () => this.editor.commands.toggleCite(),
  //   }
  // },

  // addInputRules() {
  //   return [
  //     markInputRule({
  //       find: inputRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },

  // addPasteRules() {
  //   return [
  //     markPasteRule({
  //       find: pasteRegex,
  //       type: this.type,
  //     }),
  //   ]
  // },
});

function fixCites(
  state: EditorState,
  tr: Transaction,
  citeMarkType: MarkType,
  dispatch?: Function,
  pos?: number,
): boolean {
  if (!tr) return false
  let noteNum = 0
  const doc = tr.doc
  const node = pos ? doc.nodeAt(pos) : doc
  if (!node) return false
  if (!dispatch) return true
  node.descendants((desc, dpos) => {
    if (desc.inlineContent) {
      const ranges: number[][] = []
      let start = pos ? pos + dpos + 1 : dpos + 1
      for (let i = 0; i < desc.childCount; i++) {
        const child = desc.child(i)
        const cite = child.marks.find(m => m.type.name === Cite.name)
        const stop = start + child.nodeSize
        if (cite) {
          const prevRange = ranges.length > 0 && ranges[ranges.length - 1]
          if (prevRange && prevRange[1] === start) {
            prevRange[1] = stop
          } else {
            ranges.push([start, stop])
          }
        }
        start = stop
      }
      if (!citeMarkType) return false
      ranges.forEach(([from, to]) => {
        const text = node.textBetween(from, to)
        const citations = textToCitations(text, state, from, ++noteNum)
        const citeMark = citeMarkType.create({ citations })
        if (citeMark)
          tr.removeMark(from, to, citeMarkType).addMark(from, to, citeMark)
      })
    }
    return true // descend into children
  })
  return tr.steps.length > 0
}
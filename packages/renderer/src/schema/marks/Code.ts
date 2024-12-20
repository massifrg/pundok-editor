import { Mark, mergeAttributes } from '@tiptap/core'

export interface CodeOptions {
  /**
   * Adds a prefix to language classes that are applied to code tags.
   * @default 'language-'
   */
  languageClassPrefix: string
  /**
   * The default language.
   * @default null
   * @example 'js'
   */
  defaultLanguage: string | null | undefined
  /**
   * The HTML attributes applied to the code element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    code: {
      /**
       * Set a code mark
       */
      setCode: () => ReturnType,
      /**
       * Toggle inline code
       */
      toggleCode: () => ReturnType,
      /**
       * Unset a code mark
       */
      unsetCode: () => ReturnType,
    }
  }
}

export const Code = Mark.create<CodeOptions>({
  name: 'code',

  addOptions() {
    return {
      languageClassPrefix: 'language-',
      defaultLanguage: null,
      HTMLAttributes: {},
    }
  },

  excludes: '_',

  code: true,

  exitable: true,

  addAttributes() {
    return {
      language: {
        default: this.options.defaultLanguage,
        parseHTML: element => {
          const { languageClassPrefix } = this.options
          const classNames = [...(element.firstElementChild?.classList || [])]
          const languages = classNames
            .filter(className => className.startsWith(languageClassPrefix))
            .map(className => className.replace(languageClassPrefix, ''))
          const language = languages[0]

          if (!language) {
            return null
          }

          return language
        }
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'code' },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['code', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setCode: () => ({ commands }) => {
        return commands.setMark(this.name)
      },
      toggleCode: () => ({ commands }) => {
        return commands.toggleMark(this.name)
      },
      unsetCode: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-e': () => this.editor.commands.toggleCode(),
    }
  },

})

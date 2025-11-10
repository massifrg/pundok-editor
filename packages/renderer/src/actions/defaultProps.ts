import {
  ACTION_ADD_CLASS,
  ACTION_ADD_CUSTOM_STYLE,
  ACTION_ADD_MARK,
  ACTION_SET_SPAN,
  ACTION_REMOVE_CLASS,
  ACTION_REMOVE_CUSTOM_STYLE,
  ACTION_REMOVE_MARK,
  ActionName,
  ACTION_REMOVE_CUSTOM_CLASS,
  ACTION_ADD_CUSTOM_CLASS,
  ACTION_SET_INDEX_REF,
  ACTION_INSERT_RAW_INLINE,
} from "./actions";
import {
  AddOrRemoveClassActionProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  SetSpanActionProps,
  PundokEditorConfig,
  AddOrRemoveCustomClassActionProps,
  SetIndexRefActionProps,
  DEFAULT_INDEX_NAME,
  Index,
  InsertRawInlineActionProps,
  DEFAULT_RAW_INLINE_FORMAT,
  InsertableRaw,
} from "../common";
import { RawInline } from "../schema";

export function defaultPropsFor(actionName: ActionName, config?: PundokEditorConfig): object {
  switch (actionName) {
    case ACTION_ADD_MARK.name:
    case ACTION_REMOVE_MARK.name:
      return {
        markType: 'emph'
      } as AddOrRemoveMarkActionProps
    case ACTION_ADD_CUSTOM_STYLE.name:
    case ACTION_REMOVE_CUSTOM_STYLE.name:
      const firstStyle = config?.customStyles && config.customStyles[0]
      return {
        styleName: firstStyle?.name || 'style-name'
      } as AddOrRemoveCustomStyleActionProps
    case ACTION_ADD_CUSTOM_CLASS.name:
    case ACTION_REMOVE_CUSTOM_CLASS.name:
      const cclasses = config?.customClasses || []
      const firstClass = cclasses && cclasses[0]
      const attributes = firstClass?.attributes
      const entries = attributes ?
        attributes.map(a => [a.name, (a.values && a.values[0]) || (a.suggestions && a.suggestions[0]) || ''])
        : []
      const attrs = Object.fromEntries(entries)
      return {
        className: firstClass?.name || 'class-name',
        attrs
      } as AddOrRemoveCustomClassActionProps
    case ACTION_SET_SPAN.name:
      return {
        classes: [],
        attrs: {},
        alternatives: [],
        alternativeIndex: -1,
      } as SetSpanActionProps
    case ACTION_ADD_CLASS.name:
    case ACTION_REMOVE_CLASS.name:
      {
        const classes = config?.customClasses || config?.customClasses || []
        const firstClass = classes && classes[0]
        return {
          className: firstClass?.name || 'class-name'
        } as AddOrRemoveClassActionProps
      }
    case ACTION_SET_INDEX_REF.name:
      {
        const firstIndex: Index | undefined = config?.indices && config.indices[0]
        return {
          indexName: firstIndex?.indexName || DEFAULT_INDEX_NAME
        } as SetIndexRefActionProps
      }
    case ACTION_INSERT_RAW_INLINE.name:
      {
        const firstRawInline: InsertableRaw | {} = config?.rawInlines && config.rawInlines[0] || {}
        return {
          format: config?.defaultRawFormat || RawInline.options.defaultFormat || DEFAULT_RAW_INLINE_FORMAT,
          where: 'before',
          content: ' ',
          ...firstRawInline
        } as InsertRawInlineActionProps
      }
    default:
      return {}
  }
}
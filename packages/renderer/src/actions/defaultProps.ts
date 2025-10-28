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
} from "./actions";
import {
  AddOrRemoveClassActionProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  SetSpanActionProps,
  PundokEditorConfig,
  AddOrRemoveCustomClassActionProps
} from "../common";

export function defaultPropsFor(actionName: ActionName, config?: PundokEditorConfig): object {
  switch (actionName) {
    case ACTION_ADD_MARK.name:
    case ACTION_REMOVE_MARK.name:
      return {
        markType: 'emph'
      } as AddOrRemoveMarkActionProps
    case ACTION_ADD_CUSTOM_STYLE.name:
    case ACTION_REMOVE_CUSTOM_STYLE.name:
      const styles = config?.customStyles || []
      return {
        styleName: styles[0].name || 'style-name'
      } as AddOrRemoveCustomStyleActionProps
    case ACTION_ADD_CUSTOM_CLASS.name:
    case ACTION_REMOVE_CUSTOM_CLASS.name:
      const cclasses = config?.customClasses || []
      const attributes = cclasses[0]?.attributes
      const entries = attributes ?
        attributes.map(a => [a.name, (a.values && a.values[0]) || (a.suggestions && a.suggestions[0]) || ''])
        : []
      const attrs = Object.fromEntries(entries)
      return {
        className: cclasses[0].name || 'class-name',
        attrs
      } as AddOrRemoveCustomClassActionProps
    case ACTION_SET_SPAN.name:
      return {
        name: 'custom-span',
        classes: [],
        attributes: {},
      } as SetSpanActionProps
    case ACTION_ADD_CLASS.name:
    case ACTION_REMOVE_CLASS.name:
      const classes = config?.customClasses || config?.customClasses || []
      return {
        className: classes[0].name || 'class-name'
      } as AddOrRemoveClassActionProps
    default:
      return {}
  }
}
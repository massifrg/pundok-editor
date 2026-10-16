import { toRaw } from 'vue';
import { ActionName } from './actions';
import { defaultPropsFor } from './defaultProps';
import {
  ActionNameWithProps,
  AddRemoveRenameClassActionProps,
  AddRemoveCustomClassActionProps,
  AddRemoveCustomStyleActionProps,
  AddRemoveMarkActionProps,
  attrsToCssSelectorString,
  InsertRawInlineActionProps,
  PundokEditorConfig,
  SetIndexRefActionProps,
  SetSpanActionProps,
  AddRemoveRenameAttributeActionProps,
  ConvertNodeActionProps
} from '../common';
import { nodeOrMarkToPandocName } from '../schema';
import { t } from '../i18n'

export function actionsAsText(actions: ActionNameWithProps[], config?: PundokEditorConfig) {
  if (!actions || actions.length === 0)
    return t('search.actions.noAction')
  return actions.map(a => {
    const actionName = a.name as ActionName
    const prefix = actionName.startsWith('add')
      ? '+'
      : actionName.startsWith('remove')
        ? '-'
        : ''
    const props = a?.props || defaultPropsFor(actionName)
    switch (actionName) {
      case 'add-mark':
      case 'remove-mark':
        {
          const { markType } = props as AddRemoveMarkActionProps
          return `${prefix}${markType}`
        }
      case 'add-custom-style':
      case 'remove-custom-style':
        {
          const { styleName } = props as AddRemoveCustomStyleActionProps
          return `${prefix}${styleName}`
        }
      case 'add-custom-class':
      case 'remove-custom-class':
        {
          const { shortDesc, className, attrs } = props as AddRemoveCustomClassActionProps
          const attrstext = !shortDesc && attrs
            ? attrsToCssSelectorString({ attributes: attrs })
            : ''
          return `${prefix}${shortDesc || className + attrstext}`
        }
      case 'add-attribute':
      case 'remove-attribute':
      case 'rename-attribute':
        {
          const { attrName, attrValue, newName } = props as AddRemoveRenameAttributeActionProps
          const isRemoving = actionName.startsWith('remove')
          const v = attrValue || ''
          return actionName.startsWith('rename')
            ? `[${attrName}]->[${newName}]`
            : `${isRemoving ? '-' : '+'}[${attrName}]${isRemoving ? '' : '="' + v + '"'}`
        }
      case 'add-class':
      case 'remove-class':
      case 'rename-class':
        {
          const { className, newName } = props as AddRemoveRenameClassActionProps
          return actionName.startsWith('rename')
            ? `.${className}->.${newName}`
            : `.${className}`
        }
      case 'set-span':
        {
          const { alternativeIndex, alternatives, classes, attrs } = toRaw(props) as SetSpanActionProps
          const altCount = alternatives && alternatives.length || 0
          const altIndex = alternativeIndex !== undefined ? alternativeIndex : -1
          return altIndex >= 0 && altIndex < altCount
            ? `+${alternatives![alternativeIndex].name}`
            : `+${attrsToCssSelectorString({ classes, attributes: attrs })}`
        }
      case 'set-index-ref':
        {
          const { indexName } = toRaw(props) as SetIndexRefActionProps
          return `index as ${indexName}`
        }
      case 'insert-raw-inline':
        {
          const { format, content, where } = toRaw(props) as InsertRawInlineActionProps
          const isPair = content && Array.isArray(content) && content.length > 1
          const what = isPair ? content.join('...') : content || '??'
          const _where = isPair ? '' : ' ' + where.toUpperCase()
          return `+RawInline(${format}) ${what}${_where}`
        }
      case 'convert-node':
        {
          const { nodeType, attrs } = toRaw(props) as ConvertNodeActionProps
          return `~> ${nodeOrMarkToPandocName(nodeType, undefined, undefined, attrs)}`
        }
      default:
        return actionName
    }
  }).join(',')
}

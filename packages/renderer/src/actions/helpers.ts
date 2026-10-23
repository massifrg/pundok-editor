import isString from 'lodash-es/isString'
import type { Editor } from '@tiptap/core'
import { ACTION_DESCRIPTORS } from '../common'
import { BaseAction } from './actions'

export type ActionCore = {
    label?: string | ((editor?: Editor, action?: any) => string | undefined)
    labelParams?: Record<string, string>
    tooltip?: string | ((editor?: Editor, action?: any) => string | undefined)
    tooltipParams?: Record<string, string>
    highlight?: boolean | ((editor?: Editor, action?: any) => boolean | undefined)
}

export type ActionForNodeOrMark = {
    canDo?: (editor: Editor, action?: any) => boolean
    do?: (editor: Editor, action?: any) => boolean
    restoreSelection?: boolean
    name?: string
}

export function isHighlightedAction(action: BaseAction, editor?: Editor): boolean {
    const hl = action?.highlight
    if (!hl) return false
    if (hl === true) return true
    return (hl && hl(editor, action)) || false
}

export function labelForAction(
    action: BaseAction,
    editor?: Editor,
    t?: (key: string, vars?: Record<string, any>) => string
): string | undefined {
    const { name, label } = action
    const l4a = !label
        ? name
        : isString(label) ? label : name
    if (t && name === 'convert-block' && action.labelParams?.from && action.labelParams?.to)
        return t('actions.convertBlockAction', action.labelParams) || l4a
    const descriptor = ACTION_DESCRIPTORS[name]
    if (t && descriptor?.labelKey)
        return t(descriptor.labelKey, action.labelParams || action.tooltipParams) || l4a
    return l4a
}

export function tooltipForAction(
    action: BaseAction,
    editor?: Editor,
    t?: (key: string, vars?: Record<string, any>) => string
): string | undefined {
    const { name, tooltip } = action
    const t4a = !tooltip
        ? name
        : isString(tooltip) ? tooltip : name
    const descriptor = ACTION_DESCRIPTORS[name]
    if (t && descriptor?.tooltipKey)
        return t(descriptor.tooltipKey, action.tooltipParams || action.labelParams) || t4a
    return t4a
}

export function executeEditorAction(action: ActionForNodeOrMark, editor: Editor): boolean {
    const { canDo: canDoAction, do: doAction } = action
    if (!canDoAction || !doAction) return false
    try {
        if (!canDoAction(editor as any, action)) return false
        const bookmark = (action as any).restoreSelection && (editor as any).state.selection.getBookmark()
        const result = doAction(editor as any, action) || false
        if (bookmark) (editor as any).commands.setSelectionFromBookmark(bookmark)
        return result
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('executeEditorAction error', err)
        return false
    }
}

export default {}

export function availableActionsNames(): string[] {
    return Object.keys(ACTION_DESCRIPTORS)
}

export function availableAction(actionName: string) {
    return ACTION_DESCRIPTORS[actionName]
}

export function fillAvailableAction(actionName: string, fields: { props?: object, editorKey?: number, nodeOrMark?: any }) {
    const { props, editorKey, nodeOrMark } = fields
    const available = availableAction(actionName)
    if (available && editorKey) return { ...available, props, editorKey, nodeOrMark }
    return undefined
}

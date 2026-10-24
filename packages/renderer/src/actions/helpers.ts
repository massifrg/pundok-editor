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
    if (!label) {
        const descriptor = ACTION_DESCRIPTORS[name]
        return (t && descriptor?.labelKey)
            ? t(descriptor.labelKey, action.labelParams || action.tooltipParams) || name
            : name
    } else if (isString(label))
        return label
    else if (typeof label === 'function')
        return label(editor, action)
    else
        return name
}

export function tooltipForAction(
    action: BaseAction,
    editor?: Editor,
    t?: (key: string, vars?: Record<string, any>) => string
): string | undefined {
    const { name, tooltip } = action
    if (!tooltip) {
        const descriptor = ACTION_DESCRIPTORS[name]
        return (t && descriptor?.tooltipKey)
            ? t(descriptor.tooltipKey, action.tooltipParams || action.labelParams) || name
            : name
    } else if (isString(tooltip))
        return tooltip
    else if (typeof tooltip === 'function')
        return tooltip(editor, action)
    else
        return name
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

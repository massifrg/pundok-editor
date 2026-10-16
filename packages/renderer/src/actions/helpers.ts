import isString from 'lodash-es/isString'
import type { Editor } from '@tiptap/core'
import { ACTION_DESCRIPTORS } from '../common'

export type ActionCore = {
    label?: string | ((editor?: Editor, action?: any) => string | undefined)
    tooltip?: string | ((editor?: Editor, action?: any) => string | undefined)
    highlight?: boolean | ((editor?: Editor, action?: any) => boolean | undefined)
}

export type ActionForNodeOrMark = {
    canDo?: (editor: Editor, action?: any) => boolean
    do?: (editor: Editor, action?: any) => boolean
    restoreSelection?: boolean
    name?: string
}

export function isHighlightedAction(action: ActionCore, editor?: Editor): boolean {
    const hl = action?.highlight
    if (!hl) return false
    if (hl === true) return true
    return (hl && hl(editor, action)) || false
}

export function labelForAction(action: ActionCore, editor?: Editor, t?: (key: string, vars?: Record<string, any>) => string): string | undefined {
    // Prefer descriptor-based translation when available and a translator `t` is provided.
    const anyAction: any = action
    const desc = anyAction && anyAction.name ? (anyAction.name && (anyAction.name in ACTION_DESCRIPTORS) ? ACTION_DESCRIPTORS[anyAction.name] : undefined) : undefined
    const labelKey = desc && (desc as any).labelKey
    if (labelKey && t) return t(labelKey)

    const label = action?.label
    if (!label) return undefined
    return isString(label) ? label : label(editor, action)
}

export function tooltipForAction(action: ActionCore, editor?: Editor): string | undefined {
    const tooltip = action?.tooltip
    if (!tooltip) return undefined
    return isString(tooltip) ? tooltip : tooltip(editor, action)
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

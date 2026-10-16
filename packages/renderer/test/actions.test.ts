import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    labelForAction,
    tooltipForAction,
    isHighlightedAction,
    availableActionsNames,
    availableAction,
    fillAvailableAction,
    executeEditorAction
} from '../src/actions/helpers'

type Bookmark = { pos: number }

function makeEditor() {
    let lastBookmark: Bookmark | null = null
    return {
        state: {
            selection: {
                getBookmark: () => ({ pos: 42 } as Bookmark),
            },
        },
        commands: {
            setSelectionFromBookmark: (b: Bookmark) => {
                lastBookmark = b
            },
        },
    } as any
}

describe('actions helpers', () => {
    it('labelForAction returns static and dynamic labels', () => {
        const staticAction: any = { label: 'hello' }
        expect(labelForAction(staticAction)).toBe('hello')

        const dynAction: any = { label: (_editor: any) => 'dyn' }
        expect(labelForAction(dynAction)).toBe('dyn')
    })

    it('labelForAction translates a descriptor labelKey when a translator is supplied', () => {
        const descriptor: any = { name: 'add-mark', labelKey: 'actions.addMark' }
        const translated = labelForAction(descriptor, undefined, (key: string) => `translated:${key}`)
        expect(translated).toBe('translated:actions.addMark')
    })

    it('tooltipForAction returns static and dynamic tooltips', () => {
        const staticAction: any = { tooltip: 'tip' }
        expect(tooltipForAction(staticAction)).toBe('tip')

        const dynAction: any = { tooltip: (_editor: any) => 'dytip' }
        expect(tooltipForAction(dynAction)).toBe('dytip')
    })

    it('isHighlightedAction handles boolean and function', () => {
        const always: any = { highlight: true }
        expect(isHighlightedAction(always)).toBe(true)

        const fn: any = { highlight: (_editor: any) => true }
        expect(isHighlightedAction(fn)).toBe(true)

        const none: any = {}
        expect(isHighlightedAction(none)).toBe(false)
    })

    it('availableActionsNames and availableAction expose actions', () => {
        const names = availableActionsNames()
        expect(Array.isArray(names)).toBe(true)
        // some expected action names from the module
        expect(names).toContain('add-mark')
        const addMark = availableAction('add-mark')
        expect(addMark).toBeDefined()
        expect(addMark?.name).toBe('add-mark')
    })

    it('fillAvailableAction returns undefined without editorKey and fills with editorKey', () => {
        const filled = fillAvailableAction('add-mark', { props: { foo: 1 } })
        expect(filled).toBeUndefined()
        const filled2 = fillAvailableAction('add-mark', { props: { foo: 1 }, editorKey: 1 })
        expect(filled2).toBeDefined()
        expect((filled2 as any).editorKey).toBe(1)
    })

    describe('executeEditorAction', () => {
        let editor: any
        beforeEach(() => {
            editor = makeEditor()
        })

        it('runs action when canDo true and restores selection when requested', () => {
            const doFn = vi.fn(() => true)
            const action: any = {
                canDo: () => true,
                do: doFn,
                restoreSelection: true,
                name: 'test'
            }
            const res = executeEditorAction(action, editor)
            expect(res).toBe(true)
            expect(doFn).toHaveBeenCalled()
        })

        it('does not run action when canDo false', () => {
            const doFn = vi.fn(() => true)
            const action: any = {
                canDo: () => false,
                do: doFn,
                name: 'test'
            }
            const res = executeEditorAction(action, editor)
            expect(res).toBe(false)
            expect(doFn).not.toHaveBeenCalled()
        })

        it('catches errors from do and returns false', () => {
            const doFn = vi.fn(() => { throw new Error('boom') })
            const action: any = {
                canDo: () => true,
                do: doFn,
                name: 'test'
            }
            const spy = vi.spyOn(console, 'error').mockImplementation(() => { })
            const res = executeEditorAction(action, editor)
            expect(res).toBe(false)
            expect(spy).toHaveBeenCalled()
            spy.mockRestore()
        })
    })
})

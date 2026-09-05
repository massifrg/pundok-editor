// Serializable descriptors for actions — lightweight and import-only
export type ActionDescriptor = {
    name: string
    /** translation key for the label, e.g. `actions.addMark` */
    labelKey?: string
    icon?: string
}

export const ACTION_DESCRIPTORS: Readonly<Record<string, ActionDescriptor>> = {
    'add-mark': { name: 'add-mark', labelKey: 'actions.addMark', icon: 'marks_add' },
    'remove-mark': { name: 'remove-mark', labelKey: 'actions.removeMark', icon: 'marks_remove' },
    'delete-css-selected': { name: 'delete-css-selected', labelKey: 'actions.deleteCssSelected', icon: 'delete' },
    'unwrap-css-selected': { name: 'unwrap-css-selected', labelKey: 'actions.unwrapCssSelected', icon: 'unwrap' },
    'add-custom-style': { name: 'add-custom-style', labelKey: 'actions.addCustomStyle', icon: 'character_style' },
    'remove-custom-style': { name: 'remove-custom-style', labelKey: 'actions.removeCustomStyle', icon: 'character_style' },
    'lowercase': { name: 'lowercase', labelKey: 'actions.lowercase', icon: 'case_to_lower' },
    'uppercase': { name: 'uppercase', labelKey: 'actions.uppercase', icon: 'case_to_upper' },
    'uppercase-first': { name: 'uppercase-first', labelKey: 'actions.uppercaseFirst', icon: 'case_to_upperfirst' },
    'set-span': { name: 'set-span', labelKey: 'actions.setSpan', icon: 'span_set' },
    'add-custom-class': { name: 'add-custom-class', labelKey: 'actions.addCustomClass', icon: 'custom_classes_add' },
    'remove-custom-class': { name: 'remove-custom-class', labelKey: 'actions.removeCustomClass', icon: 'remove_custom_class' },
    'add-class': { name: 'add-class', labelKey: 'actions.addClass', icon: 'classes_add' },
    'remove-class': { name: 'remove-class', labelKey: 'actions.removeClass', icon: 'remove_class' },
    'set-index-ref': { name: 'set-index-ref', labelKey: 'actions.setIndexRef', icon: 'index_ref' },
    'insert-raw-inline': { name: 'insert-raw-inline', labelKey: 'actions.insertRawInline', icon: 'raw_inline' },
}

export default ACTION_DESCRIPTORS

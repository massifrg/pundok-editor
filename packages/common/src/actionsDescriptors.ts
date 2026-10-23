// Serializable descriptors for actions — lightweight and import-only
export type ActionDescriptor = {
    name: string
    /** translation key for the label, e.g. `actions.addMark` */
    labelKey?: string
    /** interpolation values for the label */
    labelParams?: Record<string, string>
    /** translation key for the tooltip */
    tooltipKey?: string
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
    'rename-class': { name: 'rename-class', labelKey: 'actions.renameClass', icon: 'rename_class' },
    'add-attribute': { name: 'add-attribute', labelKey: 'actions.addAttribute', icon: 'add_attribute' },
    'remove-attribute': { name: 'remove-attribute', labelKey: 'actions.removeAttribute', icon: 'remove_attribute' },
    'rename-attribute': { name: 'rename-attribute', labelKey: 'actions.renameAttribute', icon: 'rename_attribute' },
    'set-index-ref': { name: 'set-index-ref', labelKey: 'actions.setIndexRef', icon: 'index_ref' },
    'insert-raw-inline': { name: 'insert-raw-inline', labelKey: 'actions.insertRawInline', icon: 'raw_inline' },
    'convert-node': { name: 'convert-node', labelKey: 'actions.convertNode', icon: 'block_convert' },
    'edit-node-or-mark-attributes': { name: 'edit-node-or-mark-attributes', labelKey: 'actions.editAttributes', icon: 'edit_attributes' },
    'open-document': { name: 'open-document', labelKey: 'actions.openDocument' },
    'repeat-change': { name: 'repeat-change', labelKey: 'actions.repeatChange' },
    'auto-set-index-term-id': { name: 'auto-set-index-term-id', labelKey: 'actions.autoSetIndexTermId' },
    'auto-set-index-terms-ids': { name: 'auto-set-index-terms-ids', labelKey: 'actions.autoSetIndexTermsIds' },
    'select-node': { name: 'select-node', labelKey: 'actions.selectNode', icon: 'select' },
    'select-mark-range': { name: 'select-mark-range', labelKey: 'actions.selectMarkRange', icon: 'select' },
    'copy-node': { name: 'copy-node', labelKey: 'actions.copyNode', icon: 'clipboard_copy' },
    'delete-node': { name: 'delete-node', labelKey: 'actions.deleteNode', icon: 'delete' },
    'duplicate-node': { name: 'duplicate-node', labelKey: 'actions.duplicateNode', icon: 'duplicate' },
    'add-table-caption': { name: 'add-table-caption', labelKey: 'actions.addTableCaption', icon: 'caption_add' },
    'add-table-head': { name: 'add-table-head', labelKey: 'actions.addTableHead', icon: 'table_head' },
    'add-table-foot': { name: 'add-table-foot', labelKey: 'actions.addTableFoot', icon: 'table_foot' },
    'prepend-table-body': { name: 'prepend-table-body', labelKey: 'actions.prependTableBody', icon: 'table_row_add_before' },
    'append-table-body': { name: 'append-table-body', labelKey: 'actions.appendTableBody', icon: 'table_row_add_after' },
    'decrease-table-body-header-rows': { name: 'decrease-table-body-header-rows', labelKey: 'actions.decreaseTableBodyHeaderRows', icon: 'table_row' },
    'increase-table-body-header-rows': { name: 'increase-table-body-header-rows', labelKey: 'actions.increaseTableBodyHeaderRows', icon: 'table_row' },
    'decrease-table-body-header-columns': { name: 'decrease-table-body-header-columns', labelKey: 'actions.decreaseTableBodyHeaderColumns', icon: 'table_column' },
    'increase-table-body-header-columns': { name: 'increase-table-body-header-columns', labelKey: 'actions.increaseTableBodyHeaderColumns', icon: 'table_column' },
    'propagate-index-name': { name: 'propagate-index-name', labelKey: 'actions.propagateIndexName' },
    'insert-before': { name: 'insert-before', labelKey: 'actions.insertBefore', tooltipKey: 'actions.insertBeforeTooltip' },
    'insert-after': { name: 'insert-after', labelKey: 'actions.insertAfter', tooltipKey: 'actions.insertAfterTooltip' },
    'convert-block': { name: 'convert-block', labelKey: 'actions.convertBlock', tooltipKey: 'actions.convertBlockTooltip' },
    'move-block': { name: 'move-block', labelKey: 'actions.moveBlock', tooltipKey: 'actions.moveBlockTooltip' },
    'insert-block-before': { name: 'insert-block-before', labelKey: 'actions.insertBlockBefore', tooltipKey: 'actions.insertBlockBeforeTooltip' },
    'insert-block-after': { name: 'insert-block-after', labelKey: 'actions.insertBlockAfter', tooltipKey: 'actions.insertBlockAfterTooltip' },
    'set-text-align': { name: 'set-text-align', labelKey: 'actions.setTextAlign' },
    'set-vertical-align': { name: 'set-vertical-align', labelKey: 'actions.setVerticalAlign' },
    'move-before-first-sibling': { name: 'move-before-first-sibling', labelKey: 'actions.moveBeforeFirstSibling', tooltipKey: 'actions.moveBeforeFirstSiblingTooltip' },
    'move-before-previous-sibling': { name: 'move-before-previous-sibling', labelKey: 'actions.moveBeforePreviousSibling', tooltipKey: 'actions.moveBeforePreviousSiblingTooltip' },
    'move-after-next-sibling': { name: 'move-after-next-sibling', labelKey: 'actions.moveAfterNextSibling', tooltipKey: 'actions.moveAfterNextSiblingTooltip' },
    'move-after-last-sibling': { name: 'move-after-last-sibling', labelKey: 'actions.moveAfterLastSibling', tooltipKey: 'actions.moveAfterLastSiblingTooltip' },
    'move-inside-prev-sibling': { name: 'move-inside-prev-sibling', labelKey: 'actions.moveInsidePreviousSibling', tooltipKey: 'actions.moveInsidePreviousSiblingTooltip' },
    'move-inside-next-sibling': { name: 'move-inside-next-sibling', labelKey: 'actions.moveInsideNextSibling', tooltipKey: 'actions.moveInsideNextSiblingTooltip' },
    'unwrap-blocks': { name: 'unwrap-blocks', labelKey: 'actions.unwrapBlocks', icon: 'unwrap' },
}

export default ACTION_DESCRIPTORS

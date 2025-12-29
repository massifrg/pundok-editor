<template>
  <ToolbarButton icon="mdi-table" title="tools for tables" @click="open()">
    <q-dialog :model-value="visible" :position="dialogPosition" seamless>
      <q-card class="q-pa-sm q-gutter-sm">
        <q-card-section class="q-ma-xs" horizontal>
          <q-btn v-if="dialogPosition != 'top'" dense class="q-px-md" icon="mdi-arrow-up"
            title="move this dialog to the top" size="xs" @click="() => { dialogPosition = 'top' }"></q-btn>
          <q-btn v-if="dialogPosition != 'bottom'" dense class="q-px-md" icon="mdi-arrow-down"
            title="move this dialog to the bottom" size="xs" @click="() => { dialogPosition = 'bottom' }"></q-btn>
          <q-btn v-if="dialogPosition != 'right'" dense class="q-px-md" icon="mdi-arrow-right"
            title="move this dialog to the right" size="xs" @click="() => { dialogPosition = 'right' }"></q-btn>
          <q-btn v-if="dialogPosition != 'left'" dense class="q-px-md" icon="mdi-arrow-left"
            title="move this dialog to the left" size="xs" @click="() => { dialogPosition = 'left' }"></q-btn>
          <q-space />
          <q-toggle v-model="showTableControls" icon="mdi-table"
            title="table controls: new/delete/fix table, add/remove caption, add head/foot" />
          <q-toggle v-model="showBodyHeadersControls" icon="mdi-table-headers-eye"
            title="add/remove top/left body headers" />
          <q-toggle v-model="showSectionsControls" icon="mdi-page-layout-header-footer"
            title="make/delete body/head/foot" />
          <q-toggle v-model="showRowsColsControls" icon="mdi-table-column" title="add/remove rows/columns" />
          <q-toggle v-model="showAlignControls" icon="mdi-format-align-left"
            title="horizontal/vertical cells alignment" />
          <q-toggle v-model="showCellsControls" icon="mdi-table-merge-cells"
            title="cells: merge/split, increase/decrease rows/columns span" />
          <q-space />
          <q-btn dense icon="mdi-close" size:xs @click="visible = false" />
        </q-card-section>
        <q-card-section v-if="showTableControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">table:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-plus" title="create new table"
              @click="newTable()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-arrow-left" title="convert text to table"
              @click="conversionMode = 'text2table'; showConversionDialog = true"
              :disabled="!editor.can().textToTable()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-arrow-right" title="convert table to text"
              @click="conversionMode = 'table2text'; showConversionDialog = true"
              :disabled="!editor.can().tableToText()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-minus" title="delete table"
              :disabled="!isCursorInTable" @click="deleteTable()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-check" title="check and fix table"
              :disabled="!editor.can().fixPandocTable()" @click="fixTable()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-column-width" title="maximise table width"
              :disabled="!editor.can().tableToFullWidth()" @click="editor?.commands.tableToFullWidth()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-sync" title="equalize column widths"
              :disabled="!editor.can().equalizeColumnWidths()" @click="editor?.commands.equalizeColumnWidths()" />
            <!-- <q-btn color="primary" rounded icon="mdi-table-lock"
              title="secure current column widths into table column specs (default widths get an actual value)"
              :disabled="!editor.can().secureColumnWidths()" @click="editor?.commands.secureColumnWidths()" /> -->
          </div>
          <!-- <div class="q-pt-sm q-mr-sm">caption:</div> -->
          <div class="q-gutter-xs">
            <q-btn :size="butSize" color="primary" rounded :icon="captionIcon()" :title="captionTitle()"
              :disabled="captionButtonDisabled()" @click="toggleCaption()" />
          </div>
        </q-card-section>
        <q-card-section v-if="showBodyHeadersControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">body headers:</div>
          <q-space></q-space>
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded dense title="decrease body's header rows"
              :disabled="!editor.can().decreaseTableBodyHeaderRows()" @click="decreaseTableBodyHeaderRows()">
              <q-icon name="mdi-table-row" />
              <q-icon name="mdi-arrow-up" size="xs" />
            </q-btn>
            <q-btn color="primary" rounded dense title="increase body's header rows"
              :disabled="!editor.can().increaseTableBodyHeaderRows()" @click="increaseTableBodyHeaderRows()">
              <q-icon name="mdi-table-row" />
              <q-icon name="mdi-arrow-down" size="xs" />
            </q-btn>
          </div>
          <div class="q-gutter-xs">
            <q-btn color="primary" rounded dense title="decrease body's header columns"
              :disabled="!editor.can().decreaseTableBodyHeaderColumns()" @click="decreaseTableBodyHeaderColumns()">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-arrow-left" size="xs" />
            </q-btn>
            <q-btn color="primary" rounded dense title="increase body's header columns"
              :disabled="!editor.can().increaseTableBodyHeaderColumns()" @click="increaseTableBodyHeaderColumns()">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-arrow-right" size="xs" />
            </q-btn>
          </div>
        </q-card-section>
        <q-card-section v-if="showSectionsControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">sections:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded dense size="sm" title="add table head"
              :disabled="!editor.can().addTableHead()" @click="addTableHead()">
              <q-icon name="mdi-page-layout-header" size="xs" />
              <q-icon name="mdi-plus" size="xs" />
            </q-btn>
            <q-btn color="primary" rounded size="sm" icon="mdi-page-layout-header"
              title="make the table head with selected rows" :disabled="!editor.can().makeTableHead()"
              @click="makeTableHead()" />
          </div>
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded dense size="sm" title="add table body before"
              :disabled="!editor.can().addTableBodyBefore()" @click="addTableBodyBefore()">
              <q-icon name="mdi-page-layout-body" size="xs" />
              <q-icon name="mdi-table-row-plus-before" size="xs" />
            </q-btn>
            <q-btn color="primary" rounded size="sm" icon="mdi-page-layout-body"
              title="make new table body with selected rows"
              :disabled="!isCursorInTable || !editor.can().makeTableBody()" @click="makeTableBody()" />
            <q-btn color="primary" rounded dense size="sm" title="add table body after"
              :disabled="!editor.can().addTableBodyAfter()" @click="addTableBodyAfter()">
              <q-icon name="mdi-page-layout-body" size="xs" />
              <q-icon name="mdi-table-row-plus-after" size="xs" />
            </q-btn>
          </div>
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded size="sm" icon="mdi-page-layout-footer"
              title="make the table foot with selected rows" :disabled="!editor.can().makeTableFoot()"
              @click="makeTableFoot()" />
            <q-btn color="primary" rounded dense size="sm" title="add table foot"
              :disabled="!editor.can().addTableFoot()" @click="addTableFoot()">
              <q-icon name="mdi-page-layout-footer" size="xs" />
              <q-icon name="mdi-plus" size="xs" />
            </q-btn>
          </div>
          <div class="q-gutter-xs">
            <q-btn color="primary" rounded size="sm" icon="mdi-trash-can" title="delete table section"
              :disabled="!editor.can().deleteSection()" @click="deleteSection()" />
          </div>
        </q-card-section>
        <q-card-section v-if="showRowsColsControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">rows & columns:</div>
          <q-space></q-space>
          <div class="q-gutter-xs q-mr-md">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-row-plus-before" title="add a row before"
              :disabled="!isCursorInTable" @click="addRowBefore()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-row-plus-after" title="add a row after"
              :disabled="!isCursorInTable" @click="addRowAfter()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-row-remove" title="remove row(s)"
              :disabled="!isCursorInTable" @click="deleteRow()" />
          </div>
          <div class="q-gutter-xs">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-column-plus-before"
              title="add a column before" :disabled="!isCursorInTable" @click="addColumnBefore()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-column-plus-after" title="add a column after"
              :disabled="!isCursorInTable" @click="addColumnAfter()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-column-remove" title="remove column(s)"
              :disabled="!isCursorInTable" @click="deleteColumn()" />
          </div>
        </q-card-section>
        <q-card-section v-if="showAlignControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">columns alignment:</div>
          <q-space />
          <div class="q-gutter-xs">
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isColTextAlign('AlignDefault')"
              title="column alignment: AlignDefault" color="primary" rounded
              @click="setColumnAlignment('AlignDefault')">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-format-columns" />
            </q-btn>
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isColTextAlign('AlignLeft')"
              title="column alignment: AlignLeft" color="primary" rounded @click="setColumnAlignment('AlignLeft')">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-format-align-left" />
            </q-btn>
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isColTextAlign('AlignCenter')"
              title="column alignment: AlignCenter" color="primary" rounded @click="setColumnAlignment('AlignCenter')">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-format-align-center" />
            </q-btn>
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isColTextAlign('AlignRight')"
              title="column alignment: AlignRight" color="primary" rounded @click="setColumnAlignment('AlignRight')">
              <q-icon name="mdi-table-column" />
              <q-icon name="mdi-format-align-right" />
            </q-btn>
          </div>
        </q-card-section>
        <q-card-section v-if="showAlignControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">alignment:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isSelTextAlign('default')"
              icon="mdi-format-columns" title="default alignment of the column (see table's ColSpec)" color="primary"
              rounded @click="unsetTextAlign()" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isSelTextAlign('left')"
              icon="mdi-format-align-left" title="align left" color="primary" rounded @click="setTextAlign('left')" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isSelTextAlign('center')"
              icon="mdi-format-align-center" title="align center" color="primary" rounded
              @click="setTextAlign('center')" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" :outline="!isSelTextAlign('right')"
              icon="mdi-format-align-right" title="align right" color="primary" rounded
              @click="setTextAlign('right')" />
          </div>
          <div class="q-gutter-xs">
            <q-btn :disabled="!isCursorInTable" :size="butSize" icon="align_baseline"
              :outline="!isSelVertAlign('baseline')" title="vertical alignment to the base line" color="primary" rounded
              @click="setVerticalAlign('baseline')" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" icon="mdi-format-align-top"
              :outline="!isSelVertAlign('top')" title="vertical alignment top" color="primary" rounded
              @click="setVerticalAlign('top')" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" icon="mdi-format-align-middle"
              :outline="!isSelVertAlign('middle')" title="vertical alignment middle" color="primary" rounded
              @click="setVerticalAlign('middle')" />
            <q-btn :disabled="!isCursorInTable" :size="butSize" icon="mdi-format-align-bottom"
              :outline="!isSelVertAlign('bottom')" title="vertical alignment bottom" color="primary" rounded
              @click="setVerticalAlign('bottom')" />
          </div>
        </q-card-section>
        <q-card-section v-if="showCellsControls" horizontal class="q-mt-md">
          <!-- <div class="q-pt-sm q-mr-sm">cell spans:</div> -->
          <div class="q-pt-sm q-mr-sm">cells:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-arrow-collapse-horizontal"
              title="decrease cell's column span" :disabled="!editor.can().decreaseColspan()"
              @click="decreaseColspan()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-arrow-expand-horizontal"
              title="increase cell's column span" :disabled="!editor.can().increaseColspan()"
              @click="increaseColspan()" />
          </div>
          <div class="q-gutter-xs q-mr-md">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-arrow-collapse-vertical"
              title="decrease cell's row span" :disabled="!editor.can().decreaseRowspan()" @click="decreaseRowspan()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-arrow-expand-vertical"
              title="increase cell's row span" :disabled="!editor.can().increaseRowspan()" @click="increaseRowspan()" />
          </div>
          <div class="q-gutter-xs">
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-merge-cells" title="merge cells"
              :disabled="!editor.can().mergeCells()" @click="mergeCells()" />
            <q-btn :size="butSize" color="primary" rounded icon="mdi-table-split-cell" title="split cell"
              :disabled="!editor.can().splitCell()" @click="splitCell()" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
    <q-dialog :model-value="visible && showConversionDialog">
      <q-card>
        <q-card-section horizontal>
          <q-btn class="q-ma-xs" size="sm" rounded color="primary" label="" title="common separators"
            icon="mdi-playlist-star">
            <q-menu anchor="bottom start" self="bottom end" auto-close>
              <q-list>
                <q-item v-for="sep in predefinedSeparators(conversionMode === 'table2text')" clickable
                  @click="setSeparator(sep.separator, sep.regex)">
                  {{ sep.description }}
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
          <q-space />
          <q-input :model-value="separator" @update:model-value="setSeparator" />
          <q-space />
          <q-btn v-if="conversionMode === 'text2table'" class="q-ma-xs" size="sm" rounded color="primary" label=""
            :outline="!regexSeparator" icon="mdi-regex" title="separator is a regular expression"
            @click="regexSeparator = !regexSeparator" />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn icon="mdi-cancel" label="cancel" color="primary" @click="showSectionsControls = false" />
          <q-btn v-if="conversionMode === 'text2table'" icon="mdi-check" label="convert" color="primary"
            @click="textToTable()" />
          <q-btn v-if="conversionMode === 'table2text'" icon="mdi-check" label="convert" color="primary"
            @click="tableToText()" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>

<script lang="ts">
import { NodeWithPos } from '@tiptap/core';
import { CellSelection, isInTable, TableMap } from '@massifrg/prosemirror-tables-sections'
import { depthOfInnerNodeType, isTableSection } from '../schema/helpers';
import ToolbarButton from './ToolbarButton.vue';
import { Alignment } from '../pandoc';
import { isString, uniq } from 'lodash';
import { NODE_NAME_TABLE_CELL, NODE_NAME_TABLE_HEADER } from '../common';
import { PmColSpec } from '../schema/helpers/colSpec';

type DialogPosition = "top" | "bottom" | "standard" | "right" | "left" | undefined
type TableConversionMode = 'text2table' | 'table2text'

export default {
  props: ['editor', 'currentNodesWithPos'],
  data() {
    return {
      visible: false,
      dialogPosition: "top" as DialogPosition,
      butSize: 'sm',
      showTableControls: true,
      showBodyHeadersControls: false,
      showSectionsControls: false,
      showRowsColsControls: true,
      showAlignControls: true,
      showCellsControls: true,
      showConversionDialog: false,
      conversionMode: 'text2table' as TableConversionMode,
      separator: undefined as string | undefined,
      regexSeparator: false,
    }
  },
  components: { ToolbarButton },
  computed: {
    isCursorInTable() {
      return this.currentCells().length > 0;
    },
  },
  watch: {
    showConversionDialog(showing: boolean) {
      if (showing) {
        const predef = this.predefinedSeparators(this.conversionMode === 'table2text')[0]
        this.separator = this.separator || predef.separator
        this.regexSeparator = this.regexSeparator && this.conversionMode === 'text2table' || predef.regex
      }
    }
  },
  methods: {
    currentCells(): NodeWithPos[] {
      const selection = this.editor.state.selection
      if (selection instanceof CellSelection) {
        const cells: NodeWithPos[] = []
        selection.forEachCell((node, pos) => {
          cells.push({ node, pos })
        })
        return cells
      } else {
        const $pos = selection.$anchor
        const d = depthOfInnerNodeType($pos, [NODE_NAME_TABLE_CELL, NODE_NAME_TABLE_HEADER])
        return d ? [{ node: $pos.node(d), pos: $pos.start(d) - 1 }] : []
      }
    },
    isSelTextAlign(align: string): boolean {
      const cells = this.currentCells()
      return cells.length > 0 &&
        (align === 'default'
          ? cells.every(c => c.node.attrs.textAlign?.startsWith('default'))
          : cells.every(c => c.node.attrs.textAlign === align))
    },
    isSelVertAlign(align: string): boolean {
      const cells = this.currentCells()
      return cells.length > 0 && cells.every(c => c.node.attrs.verticalAlign === align)
    },
    isColTextAlign(align: Alignment): boolean {
      const cells = this.currentCells()
      if (cells.length === 0)
        return false
      const doc = this.editor.state.doc
      const $tablePos = doc.resolve(cells[0].pos)
      const table = $tablePos.node(-2)
      const tableStart = $tablePos.start(-2)
      const map = TableMap.get(table)
      const columns = uniq(cells.map(({ pos }) => map.colCount(pos - tableStart)))
      const colSpec: PmColSpec[] = table.attrs.colSpec
      return columns.every(col => colSpec[col].align === align)
    },
    open(where?: DialogPosition) {
      if (where) this.dialogPosition = where
      this.visible = true
    },
    newTable() {
      this.editor?.chain()
        .insertPandocTable({ rows: 3, cols: 3, cellContainer: 'plain' })
        .fixPandocTable()
        .focus()
        .run()
    },
    textToTable() {
      const sep = this.regexSeparator ? new RegExp(this.separator!) : this.separator
      this.editor?.commands.textToTable(sep)
      this.showConversionDialog = false
    },
    tableToText() {
      this.editor?.commands.tableToText(this.separator)
      this.showConversionDialog = false
    },
    deleteTable() {
      this.editor?.chain().deleteTable().focus().run()
    },
    fixTable() {
      this.editor?.chain().fixPandocTable().focus().run()
    },
    captionButtonDisabled() {
      return !this.editor || !isInTable(this.editor.state)
    },
    captionIcon() {
      const editor = this.editor
      const state = editor?.state
      return state && isInTable(state) && editor.can().deleteTableCaption()
        ? "mdi-tooltip-minus-outline"
        : "mdi-tooltip-plus-outline"
    },
    captionTitle() {
      const editor = this.editor
      const state = editor?.state
      return state && isInTable(state) && editor.can().deleteTableCaption()
        ? "delete caption"
        : "add caption"
    },
    toggleCaption() {
      const editor = this.editor
      if (editor?.can().deleteTableCaption())
        editor.chain().deleteTableCaption().focus().run()
      else
        editor.chain().addTableCaption().focus().run()
    },
    deleteSection() {
      this.editor?.chain().deleteSection().focus().run()
    },
    makeTableHead() {
      this.editor?.chain().makeTableHead().focus().run()
    },
    addTableHead() {
      this.editor?.chain().addTableHead().focus().run()
    },
    removeTableHead() {
      this.editor?.chain().removeTableHead().focus().run()
    },
    makeTableBody() {
      this.editor.commands.runRepeatableCommandsChain(
        [
          ['makeTableBody'],
          ['fixPandocTable'],
          ['focus']
        ],
        "create new table body from selected rows"
      )
    },
    addTableBodyBefore() {
      this.editor?.chain().addTableBodyBefore().fixPandocTable().focus().run()
    },
    addTableBodyAfter() {
      this.editor?.chain().addTableBodyAfter().fixPandocTable().focus().run()
    },
    makeTableFoot() {
      this.editor?.chain().makeTableFoot().fixPandocTable().focus().run()
    },
    addTableFoot() {
      this.editor?.chain().addTableFoot().fixPandocTable().focus().run()
    },
    removeTableFoot() {
      this.editor?.chain().removeTableFoot().fixPandocTable().focus().run()
    },
    increaseTableBodyHeaderRows() {
      this.editor?.chain().increaseTableBodyHeaderRows().fixPandocTable().focus().run()
    },
    decreaseTableBodyHeaderRows() {
      this.editor?.chain().decreaseTableBodyHeaderRows().fixPandocTable().focus().run()
    },
    increaseTableBodyHeaderColumns() {
      this.editor?.chain().increaseTableBodyHeaderColumns().fixPandocTable().focus().run()
    },
    decreaseTableBodyHeaderColumns() {
      this.editor?.chain().decreaseTableBodyHeaderColumns().fixPandocTable().focus().run()
    },
    addRowBefore() {
      this.editor?.chain().addRowBefore().fixPandocTable().focus().run()
    },
    addRowAfter() {
      this.editor?.chain().addRowAfter().fixPandocTable().focus().run()
    },
    deleteRow() {
      this.editor?.chain().deleteRow().fixPandocTable().focus().run()
    },
    addColumnBefore() {
      this.editor?.chain().addColumnBefore().fixPandocTable().focus().run()
    },
    addColumnAfter() {
      this.editor?.chain().addColumnAfter().fixPandocTable().focus().run()
    },
    deleteColumn() {
      this.editor?.chain().deleteColumn().fixPandocTable().focus().run()
    },
    decreaseRowspan() {
      this.editor?.chain().decreaseRowspan().fixPandocTable().focus().run()
    },
    increaseRowspan() {
      this.editor?.chain().increaseRowspan().fixPandocTable().focus().run()
    },
    decreaseColspan() {
      this.editor?.chain().decreaseColspan().fixPandocTable().focus().run()
    },
    increaseColspan() {
      this.editor?.chain().increaseColspan().fixPandocTable().focus().run()
    },
    setTextAlign(align: string) {
      this.editor?.commands.runRepeatableCommand(
        'setTextAlign',
        `set alignment to ${align}`,
        align,
      )
    },
    unsetTextAlign() {
      this.editor.commands.runRepeatableCommandsChain(
        [
          ['unsetTextAlign'],
          ['fixPandocTable'],
        ],
        "set alignment to the default of the column"
      )
    },
    setColumnAlignment(alignment: Alignment) {
      this.editor.commands.runRepeatableCommand(
        'setColumnAlignment',
        `set the default column alignment (in ColSpec) to ${alignment}`,
        alignment
      )
    },
    setVerticalAlign(align: string) {
      this.editor?.commands.runRepeatableCommand(
        'setVerticalAlign',
        `set vertical alignment to ${align}`,
        align
      )
    },
    mergeCells() {
      this.editor?.commands.runRepeatableCommandsChain(
        [
          ['mergeCells'],
          ['fixPandocTable']
        ],
        'merge cells'
      )
    },
    splitCell() {
      this.editor?.commands.runRepeatableCommandsChain(
        [
          ['splitCell'],
          ['fixPandocTable']
        ],
        'split cell'
      )
    },
    predefinedSeparators(noRegex?: boolean): { separator: string, regex: boolean, description: string }[] {
      return ([
        { separator: "\\s{2,}", regex: true, description: "2 or more spaces" },
        { separator: "\\s+", regex: true, description: "1 or more spaces" },
        { separator: "|", regex: false, description: "vertical bar" },
        { separator: "\\s*,\\s*", regex: true, description: "comma (with eventual spaces around)" },
        { separator: "\\s*;\\s*", regex: true, description: "semicolon (with eventual spaces around)" },
        { separator: "  ", regex: false, description: "double space" },
        { separator: "; ", regex: false, description: "semicolon and space" },
      ]).filter(s => !(noRegex && s.regex))
    },
    setSeparator(separator: string | number | null, regex?: boolean) {
      if (isString(separator) && separator.length > 0) {
        console.log(separator)
        this.separator = separator
        if (regex !== undefined) this.regexSeparator = regex
      }
    }
  }
}
</script>
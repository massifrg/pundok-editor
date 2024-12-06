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
            <q-btn color="primary" rounded icon="mdi-table-plus" title="create new table" @click="newTable()" />
            <q-btn color="primary" rounded icon="mdi-table-minus" title="delete table" :disabled="!isCursorInTable"
              @click="deleteTable()" />
            <q-btn color="primary" rounded icon="mdi-table-check" title="check and fix table"
              :disabled="!editor.can().fixPandocTable()" @click="fixTable()" />
            <q-btn color="primary" rounded icon="mdi-table-column-width" title="maximise table width"
              :disabled="!editor.can().tableToFullWidth()" @click="editor?.commands.tableToFullWidth()" />
            <q-btn color="primary" rounded icon="mdi-table-sync" title="equalize column widths"
              :disabled="!editor.can().equalizeColumnWidths()" @click="editor?.commands.equalizeColumnWidths()" />
            <!-- <q-btn color="primary" rounded icon="mdi-table-lock"
              title="secure current column widths into table column specs (default widths get an actual value)"
              :disabled="!editor.can().secureColumnWidths()" @click="editor?.commands.secureColumnWidths()" /> -->
          </div>
          <!-- <div class="q-pt-sm q-mr-sm">caption:</div> -->
          <div class="q-gutter-xs">
            <q-btn color="primary" rounded :icon="captionIcon()" :title="captionTitle()"
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
              title="make new table body with selected rows" :disabled="!editor.can().makeTableBody()"
              @click="makeTableBody()" />
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
            <q-btn color="primary" rounded icon="mdi-table-row-plus-before" title="add a row before"
              :disabled="!isCursorInTable" @click="addRowBefore()" />
            <q-btn color="primary" rounded icon="mdi-table-row-plus-after" title="add a row after"
              :disabled="!isCursorInTable" @click="addRowAfter()" />
            <q-btn color="primary" rounded icon="mdi-table-row-remove" title="remove row(s)"
              :disabled="!isCursorInTable" @click="deleteRow()" />
          </div>
          <div class="q-gutter-xs">
            <q-btn color="primary" rounded icon="mdi-table-column-plus-before" title="add a column before"
              :disabled="!isCursorInTable" @click="addColumnBefore()" />
            <q-btn color="primary" rounded icon="mdi-table-column-plus-after" title="add a column after"
              :disabled="!isCursorInTable" @click="addColumnAfter()" />
            <q-btn color="primary" rounded icon="mdi-table-column-remove" title="remove column(s)"
              :disabled="!isCursorInTable" @click="deleteColumn()" />
          </div>
        </q-card-section>
        <q-card-section v-if="showAlignControls" horizontal class="q-mt-md">
          <div class="q-pt-sm q-mr-sm">alignment:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-left" title="align left" color="primary" rounded
              @click="setTextAlign('left')" />
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-center" title="align center" color="primary"
              rounded @click="setTextAlign('center')" />
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-right" title="align right" color="primary"
              rounded @click="setTextAlign('right')" />
          </div>
          <div class="q-gutter-xs">
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-top" title="vertical alignment top"
              color="primary" rounded @click="setVerticalAlign('top')" />
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-middle" title="vertical alignment middle"
              color="primary" rounded @click="setVerticalAlign('middle')" />
            <q-btn :disabled="!isCursorInTable" icon="mdi-format-align-bottom" title="vertical alignment bottom"
              color="primary" rounded @click="setVerticalAlign('bottom')" />
          </div>
        </q-card-section>
        <q-card-section v-if="showCellsControls" horizontal class="q-mt-md">
          <!-- <div class="q-pt-sm q-mr-sm">cell spans:</div> -->
          <div class="q-pt-sm q-mr-sm">cells:</div>
          <q-space />
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded icon="mdi-arrow-collapse-horizontal" title="decrease cell's column span"
              :disabled="!editor.can().decreaseColspan()" @click="editor.chain().decreaseColspan().focus().run()" />
            <q-btn color="primary" rounded icon="mdi-arrow-expand-horizontal" title="increase cell's column span"
              :disabled="!editor.can().increaseColspan()" @click="editor.chain().increaseColspan().focus().run()" />
          </div>
          <div class="q-gutter-xs q-mr-md">
            <q-btn color="primary" rounded icon="mdi-arrow-collapse-vertical" title="decrease cell's row span"
              :disabled="!editor.can().decreaseRowspan()" @click="editor.chain().decreaseRowspan().focus().run()" />
            <q-btn color="primary" rounded icon="mdi-arrow-expand-vertical" title="increase cell's row span"
              :disabled="!editor.can().increaseRowspan()" @click="editor.chain().increaseRowspan().focus().run()" />
          </div>
          <div class="q-gutter-xs">
            <q-btn color="primary" rounded icon="mdi-table-merge-cells" title="merge cells"
              :disabled="!editor.can().mergeCells()" @click="mergeCells()" />
            <q-btn color="primary" rounded icon="mdi-table-split-cell" title="split cell"
              :disabled="!editor.can().splitCell()" @click="splitCell()" />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>

<script lang="ts">
import { NodeWithPos } from '@tiptap/core';
import { isInTable } from '@massifrg/prosemirror-tables-sections'
import { isTableSection } from '../schema/helpers';
import ToolbarButton from './ToolbarButton.vue';

type DialogPosition = "top" | "bottom" | "standard" | "right" | "left" | undefined

export default {
  props: ['editor', 'currentNodesWithPos'],
  data() {
    return {
      visible: false,
      dialogPosition: "top" as DialogPosition,
      showTableControls: true,
      showBodyHeadersControls: false,
      showSectionsControls: false,
      showRowsColsControls: true,
      showAlignControls: true,
      showCellsControls: true
    }
  },
  components: { ToolbarButton },
  computed: {
    selection() {
      const selection = this.editor.state.selection;
      // console.log(selection)
      if (selection.$anchorCell && selection.$headCell) {
        // console.log(selection.content().content)
        return true;
      }
      return false;
    },
    currentTableSection(): NodeWithPos | undefined {
      const cnwp: NodeWithPos[] = this.currentNodesWithPos
      return cnwp.find(({ node }) => isTableSection(node));
    },
    currentCell(): NodeWithPos | undefined {
      return [...this.currentNodesWithPos].reverse().find(({ node }) => {
        const name = node.type.name;
        return name.startsWith('tableCell') || name.startsWith('tableHeader');
      });
    },
    isCursorInTable() {
      return !!this.currentTableSection;
    },
    currentCellColspan() {
      return this.currentCell && this.currentCell.node.attrs.colspan;
    },
    currentCellRowspan() {
      return this.currentCell && this.currentCell.node.attrs.rowspan;
    },
  },
  methods: {
    open(where?: DialogPosition) {
      if (where) this.dialogPosition = where
      this.visible = true
    },
    newTable() {
      this.editor?.chain().insertPandocTable({ rows: 3, cols: 3, cellContainer: 'plain' }).initializeTables().focus().run()
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
      this.editor?.chain().addTableBodyBefore().focus().run()
    },
    addTableBodyAfter() {
      this.editor?.chain().addTableBodyAfter().focus().run()
    },
    makeTableFoot() {
      this.editor?.chain().makeTableFoot().focus().run()
    },
    addTableFoot() {
      this.editor?.chain().addTableFoot().focus().run()
    },
    removeTableFoot() {
      this.editor?.chain().removeTableFoot().focus().run()
    },
    increaseTableBodyHeaderRows() {
      this.editor?.chain().increaseTableBodyHeaderRows().focus().run()
    },
    decreaseTableBodyHeaderRows() {
      this.editor?.chain().decreaseTableBodyHeaderRows().focus().run()
    },
    increaseTableBodyHeaderColumns() {
      this.editor?.chain().increaseTableBodyHeaderColumns().focus().run()
    },
    decreaseTableBodyHeaderColumns() {
      this.editor?.chain().decreaseTableBodyHeaderColumns().focus().run()
    },
    addRowBefore() {
      this.editor?.chain().addRowBefore().focus().run()
    },
    addRowAfter() {
      this.editor?.chain().addRowAfter().focus().run()
    },
    deleteRow() {
      this.editor?.chain().deleteRow().focus().run()
    },
    addColumnBefore() {
      this.editor?.chain().addColumnBefore().focus().run()
    },
    addColumnAfter() {
      this.editor?.chain().addColumnAfter().focus().run()
    },
    deleteColumn() {
      this.editor?.chain().deleteColumn().focus().run()
    },
    setTextAlign(align: string) {
      this.editor?.commands.runRepeatableCommandsChain(
        [
          ['setTextAlign', align],
          ['updateColSpecs']
        ],
        `set alignment to ${align}`
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
      this.editor?.commands.runRepeatableCommand('mergeCells', 'merge cells')
    },
    splitCell() {
      this.editor?.commands.runRepeatableCommand('splitCell', 'split cell')
    }
  }
}
</script>
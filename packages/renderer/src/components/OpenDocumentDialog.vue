<script lang="ts">
import { mapState } from 'pinia';
import { BackendSetContentActionProps, Document, Folder } from '../common';
import { useBackend } from '../stores';
import { QTableColumn } from 'quasar';
import { ACTION_BACKEND_SET_CONTENT, setActionCommand, setActionOpenDocument } from '../actions';
import { toRaw } from 'vue';
import { editorKeyFromState } from '../schema';

interface FileContentRow {
  name: string,
  label: string,
  icon?: string,
  isDocument: boolean,
  isFolder: boolean,
}

const cols: QTableColumn[] = [{
  name: 'name',
  required: true,
  label: 'name',
  align: "left",
  field: (content: Folder | Document) => content.name,
  // format: val => `${val}`,
  sortable: true
}]

export default {
  props: ['editor', 'startFolder'],
  emits: ['hide'],
  data() {
    return {
      visible: true,
      currentFolder: this.startFolder || ['.'],
      folders: [] as Folder[],
      documents: [] as Document[],
      separator: '/',
      selectedDocument: undefined as string | undefined,
      pagination: { rowsPerPage: 0 },
      selected: [] as FileContentRow[],
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    columns() {
      return cols
    },
    rows(): FileContentRow[] {
      const folders = this.folders.map(folder => ({
        name: folder.name,
        label: folder.name,
        icon: 'mdi-folder',
        isFolder: true,
        isDocument: false,
      }))
      const documents = this.documents
        .map(doc => ({
          name: doc.name,
          label: doc.name,
          icon: 'mdi-file-document',
          isFolder: false,
          isDocument: true,
        }))
      return [...folders, ...documents]
    },
  },
  methods: {
    async getContents() {
      try {
        const path = toRaw(this.currentFolder).join(this.separator) + this.separator
        const contents = await this.backend?.getFolderContents({ path })
        this.currentFolder = contents?.base || this.currentFolder
        this.folders = contents?.folders || this.folders
        this.documents = contents?.documents || this.documents
        this.separator = contents?.separator || this.separator
      } catch (err) {
        console.log(err)
      }
      this.selectedDocument = undefined
    },
    click(row: FileContentRow) {
      if (row.isDocument) {
        this.selectedDocument = [...this.currentFolder, row.name].join(this.separator)
        const sel = this.rows.find(r => r.name === row.name)
        this.selected = sel ? [sel] : []
      }
    },
    doubleClick(row: FileContentRow) {
      if (row.isDocument) {
        this.selectedDocument = row.name
        this.openSelectedDocument()
      } else if (row.isFolder) {
        const cf = this.currentFolder
        this.currentFolder = row.name === '..'
          ? cf.slice(0, cf.length - 1)
          : [...cf, row.name]
        this.getContents()
      }
    },
    async openSelectedDocument() {
      const path = this.selectedDocument
      const editorKey = editorKeyFromState(this.editor.state)
      if (path && editorKey) {
        const doc = await this.backend?.open({
          path,
          // configurationName,
          // project,
          editorKey,
        });
        if (doc) setActionCommand(
          editorKey,
          ACTION_BACKEND_SET_CONTENT,
          { content: doc } as BackendSetContentActionProps
        )
      }
      this.closeDialog()
    },
    closeDialog() {
      this.$emit('hide')
    },
    onOk() {
      this.openSelectedDocument()
    },
    onCancel() {
      this.closeDialog()
    }
  }
}
</script>

<template>
  <q-dialog v-model="visible" full-width @before-show="getContents()">
    <q-card>
      <q-card-section>
        <div>{{ currentFolder.join(separator) }}</div>
      </q-card-section>
      <q-card-section>
        <div class="q-pa-md">
          <q-table class="folder-contents-table" dense flat bordered :rows="rows" :columns="columns" row-key="name"
            selection="single" v-model:selected="selected" style="height: 400px" virtual-scroll
            v-model:pagination="pagination" :rows-per-page-options="[0]">
            <template v-slot:body-selection="scope">
              <q-icon v-if="selected.find(s => s.name === scope.row.name)" name="mdi-check" />
            </template>
            <template v-slot:body-cell-name="props">
              <q-td :props="props">
                <div class="content-name" @click="click(props.row)" @dblclick="doubleClick(props.row)"
                  @keypress.enter="doubleClick(props.row)">
                  <q-icon :name="props.row.icon" />
                  {{ props.row.name }}
                </div>
              </q-td>
            </template>
          </q-table>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" label="Reload" @click="getContents()" />
        <q-space />
        <q-btn color="primary" label="OK" @click="onOk" />
        <q-btn color="primary" label="Cancel" @click="onCancel" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style lang="sass">
.folder-contents-table
  /* height or max-height is important */
  height: 310px

  .q-table__top,
  .q-table__bottom,
  thead tr:first-child th
    /* bg color is important for th; just specify one */
    background-color: #00b4ff

  thead tr th
    position: sticky
    z-index: 1
  thead tr:first-child th
    top: 0

  /* this is when the loading indicator appears */
  &.q-table--loading thead tr:last-child th
    /* height of all previous header rows */
    top: 2rem

  /* prevent scrolling behind sticky top row on focus */
  tbody
    /* height of all previous header rows */
    scroll-margin-top: 2rem;
  
  & .content-name
    cursor: pointer;
</style>
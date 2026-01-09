<script lang="ts">
import { toRaw } from 'vue';
import { mapState } from 'pinia';
import { QTable, QTableColumn } from 'quasar';
import {
  BackendSetContentActionProps,
  Document,
  DocumentBookmark,
  Folder,
  formatsFromExtension,
  getPandocFormatDescriptions,
  guessFormatFromExtension,
  InputConverter,
  knownFormatExtensions,
  OutputConverter,
  PandocFormatDescription,
  pandocFormatToInputConverter,
  ProjectBookmark,
  PundokEditorConfig,
} from '../common';
import { useBackend } from '../stores';
import { ACTION_BACKEND_SET_CONTENT, setActionCommand } from '../actions';
import { editorKeyFromState, getEditorConfiguration } from '../schema';

interface FileContentRow {
  name: string,
  label: string,
  icon?: string,
  isDocument: boolean,
  isFolder: boolean,
}

type DocumentFormatType = 'guess' | 'format' | 'input-converter' | 'output-converter'
/**
 * The document format can be a plain Pandoc format or a (input or output) converter.
 */
type DocumentFormat = (PandocFormatDescription | InputConverter | OutputConverter)
  & { ftype: DocumentFormatType }
const guessFormat: DocumentFormat = {
  ftype: 'guess',
  name: 'guess',
  description: 'let the editor guess the format from the file',
  icon: 'mdi-file-question',
  input: true,
  output: false,
  extensions: [],
  priority: 1,
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
  props: ['editor', 'startFolder', 'direction', 'prompt'],
  emits: ['hide'],
  data() {
    return {
      visible: true,
      /** An array of the folders' names of the current path */
      currentFolder: this.startFolder || ['.'],
      /** The sub folders in the current folder */
      folders: [] as Folder[],
      /** The documents (files) in the current folder */
      documents: [] as Document[],
      /** The path separator ('/' on Linux/MacOS, '\' in Windows) */
      separator: '/',
      /** The name of the selected document  */
      selectedDocument: undefined as string | undefined,
      /** Pagination for QTable */
      pagination: { rowsPerPage: 0 },
      /** The document(s) that are selected in the QTable */
      selected: [] as FileContentRow[],
      /** The available Pandoc formats and input/output converters */
      pandocFormats: [] as PandocFormatDescription[],
      /** The current, selected format/converter to use to read/save the document */
      format: undefined as DocumentFormat | undefined,
      /** The file extensions to filter the documents */
      extensions: [] as string[],
      /** Bookmarks to recent documents */
      docBookmarks: [] as DocumentBookmark[],
      /** Bookmarks to recent projects */
      projectBookmarks: [] as ProjectBookmark[],
      /** A flag to hide the subfolders in the QTable */
      hideFolders: false,
      /** A flag to show all the available formats, instead of the main ones */
      showAllFormats: false,
      /** A temporary configuration of the project file eventually present in the current folder */
      tempConfiguration: undefined as PundokEditorConfig | undefined,
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    columns() {
      return cols
    },
    rows(): FileContentRow[] {
      const folders = this.hideFolders ? [] : this.folders.map(folder => ({
        name: folder.name,
        label: folder.name,
        icon: 'mdi-folder',
        isFolder: true,
        isDocument: false,
      }))
      let documents = this.documents
        .map(doc => ({
          name: doc.name,
          label: doc.name,
          icon: 'mdi-file-document',
          isFolder: false,
          isDocument: true,
        }))
      if (this.extensions.length > 0) {
        const exts = this.extensions.map(e => '.' + e)
        documents = documents.filter(d => !!exts.find(e => d.name.endsWith(e)))
      }
      return [...folders, ...documents]
    },
    dialogPrompt() {
      return this.prompt || (this.direction === 'output' ? 'Write to document:' : 'Open document:')
    },
    configuration() {
      return getEditorConfiguration(this.editor.state)
    },
    inputConverters(): InputConverter[] {
      const current = this.configuration?.inputConverters || []
      // read converters from the config of a project eventually present in the current folder
      const temp = (this.tempConfiguration?.inputConverters || [])
        .filter(t => !current.find(c => c.name === t.name))
      return [...current, ...temp]
    },
    outputConverters(): OutputConverter[] {
      const current = this.configuration?.outputConverters || []
      // read converters from the config of a project eventually present in the current folder
      const temp = (this.tempConfiguration?.outputConverters || [])
        .filter(t => !current.find(c => c.name === t.name))
      return [...current, ...temp]
    },
    documentFormats(): DocumentFormat[] {
      const isInput = this.direction !== 'output'
      let converters = isInput
        ? this.inputConverters.map(ic => ({ ...ic, ftype: 'input-converter' as DocumentFormatType }))
        : this.outputConverters.map(ic => ({ ...ic, ftype: 'output-converter' as DocumentFormatType }))
      let pandocFormats = this.pandocFormats
        .filter(f => isInput ? f.input === true : f.output === true)
        .map(f => ({ ...f, ftype: 'format' as DocumentFormatType }))
      if (!this.showAllFormats)
        pandocFormats = pandocFormats.filter(f => (f.priority || 0) >= 1)
      let formats = [...converters, ...pandocFormats]
      if (isInput && formats[0].ftype !== 'guess')
        formats.unshift(guessFormat)
      return formats
    }
  },
  mounted() {
    const getFormatsAndBookmarks = async () => {
      const input_formats: string[] = await this.backend?.pandocInputFormats() || []
      const output_formats: string[] = await this.backend?.pandocOutputFormats() || []
      const format_descriptions = getPandocFormatDescriptions(input_formats, output_formats)
      this.pandocFormats = [...this.pandocFormats, ...format_descriptions]
      this.format = guessFormat
      this.docBookmarks = (await this.backend?.getBookmarks('document') || []) as DocumentBookmark[]
      this.projectBookmarks = (await this.backend?.getBookmarks('project') || []) as ProjectBookmark[]

      // DEBUG: TODO: remove the next 3 lines
      // const exts = knownFormatExtensions('input')
      // console.log(exts.map(e => `${e}: ${formatsFromExtension(e, 'output').join()}`))
      // console.log(exts.map(e => `${e}: ${guessFormatFromExtension(e, 'output') || '-'}`))
    }
    getFormatsAndBookmarks()
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
    inputConverterFromDocumentFormat(path: string): InputConverter | undefined {
      if (!this.format || this.format?.ftype === 'guess') {
        let ic = this.inputConverters.find(c => c.extensions.find(e => path.endsWith(`.${e}`)))
        if (ic)
          return toRaw(ic)
        const ext = path.replace(/^.*?(([.][0-9a-z]{1,5})?[.][0-9a-z]+)$/i, '$1')
        const format = guessFormatFromExtension(ext, 'input')
        return format ? pandocFormatToInputConverter(format) : undefined
      }
      const format = this.format
      const { ftype } = format
      if (ftype === 'output-converter')
        return undefined
      if (ftype === 'format')
        return pandocFormatToInputConverter(format)
      if (ftype === 'input-converter')
        return format as InputConverter
      return undefined
    },
    async openSelectedDocument() {
      const path = this.selectedDocument
      const editorKey = editorKeyFromState(this.editor.state)
      if (path && editorKey) {
        const inputConverter = this.inputConverterFromDocumentFormat(path)
        console.log(inputConverter)
        const doc = await this.backend?.open({
          path,
          inputConverter,
          // configurationName,
          // project,
          editorKey,
        });
        // TODO: check if JSON is valid
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
    },
    formatExtensions(format: DocumentFormat): string[] {
      if (format.ftype === 'output-converter') {
        const ext = ((format as never) as OutputConverter).extension
        return ext ? [ext] : []
      } else {
        return (format as PandocFormatDescription | InputConverter).extensions || []
      }
    },
    iconForFormat(format?: DocumentFormat): string {
      if (format?.ftype === 'input-converter')
        return 'mdi-import'
      if (format?.ftype === 'output-converter')
        return 'mdi-export'
      return format?.icon || 'mdi-code-tags'
    },
    selectFormat(format: DocumentFormat) {
      this.format = format
      this.extensions = (format as PandocFormatDescription | InputConverter).extensions || []
    },
    splitFolderAndDoc(path: string) {
      const folder = path.split(this.separator)
      const document = folder.pop()
      return {
        folder: folder.join(this.separator),
        document
      }
    },
    async gotoPath(path: string) {
      const folder = path.split(this.separator)
      const name = folder.pop()
      if (folder.length > 0) {
        this.currentFolder = folder;
        await this.getContents()
        this.selectedDocument = path
        if (name)
          this.scrollToSelectedDocument(name, 500)
        const tempProject = await this.backend?.getProject({
          path: folder.join(this.separator),
          computeConfig: true
        })
        if (tempProject)
          this.tempConfiguration = tempProject.computedConfig
      }
    },
    scrollToSelectedDocument(name: string, delay?: number) {
      const selIndex = this.rows.findIndex(r => r.isDocument && r.name === name)
      this.selected = selIndex >= 0 ? [this.rows[selIndex]] : [];
      setTimeout(() => { (this.$refs.docsTable as QTable).scrollTo(selIndex) }, delay || 500)
    }
  }
}
</script>

<template>
  <q-dialog v-model="visible" full-width persistent no-esc-dismiss @before-show="getContents()">
    <q-card>
      <q-card-section horizontal class="q-pa-sm q-pb-none q-mb-none">
        <span class="bg-info text-body1 q-pa-md">{{ dialogPrompt }}</span>
        <q-space />
        <span class="q-pa-md">Go to a recent:</span>
        <q-space style="max-width: .1rem;" />
        <q-btn-dropdown label="project" no-caps auto-close dense class="q-my-xs">
          <q-list>
            <q-item v-for="pb in projectBookmarks" clickable @click="gotoPath(pb.path)">
              <q-item-section>{{ pb.name }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        &nbsp;
        <q-btn-dropdown label="document" no-caps auto-close dense class="q-my-xs">
          <q-list>
            <q-item v-for="db in docBookmarks" clickable @click="gotoPath(db.path)">
              <q-item-section>
                <q-item-label :title="db.path">{{ splitFolderAndDoc(db.path).document }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-section>
      <q-card-section class="q-px-md q-ma-none">
        <div class="row q-ma-none q-pa-none">
          <div class="text-body2 self-end">{{ currentFolder.join(separator) }} </div>
          <q-space />
          <q-toggle v-model="hideFolders" size="sm" title="hide/show folders" label="hide folders:" left-label />
        </div>
        <q-table ref="docsTable" class="folder-contents-table" dense flat bordered :rows="rows" :columns="columns"
          row-key="name" selection="single" v-model:selected="selected" style="height: 400px" virtual-scroll
          v-model:pagination="pagination" :rows-per-page-options="[0]">
          <template v-slot:body-selection="scope">
            <q-icon v-if="selected.find(s => s.name === scope.row.name)" name="mdi-check" />
          </template>
          <template v-slot:body-cell-name="props">
            <q-td :props="props">
              <div class="content-name" @click="click(props.row)" @dblclick="doubleClick(props.row)"
                @keypress.enter="doubleClick(props.row)">
                <q-icon :name="props.row.icon" />
                <span class="text-body1 q-pl-sm">{{ props.row.name }}</span>
              </div>
            </q-td>
          </template>
        </q-table>
      </q-card-section>
      <q-card-section horizontal>
        <div class="q-pa-md">Format/Custom {{ direction === 'output' ? 'writer' : 'reader' }}:</div>
        <q-btn-dropdown :label="format?.name" :icon="iconForFormat(format)" :title="format?.description" auto-close
          no-caps class="q-my-sm">
          <q-list>
            <q-item v-for="df in documentFormats" :title="df.description" clickable dense :class="{
              'bg-brown-2': df.ftype === 'guess',
              'bg-teal-2': df.ftype === 'input-converter',
              'bg-amber-2': df.ftype === 'output-converter'
            }" @click="selectFormat(df)">
              <q-item-section avatar>
                <q-icon :name="iconForFormat(df)" />
              </q-item-section>
              <q-item-section>{{ df.name }}</q-item-section>
              <q-item-section>{{formatExtensions(df).map(e => `*.${e}`).join(', ')}}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        &nbsp;
        <q-toggle v-model="showAllFormats" title="show all formats" label="show all formats" />
        <q-space />
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
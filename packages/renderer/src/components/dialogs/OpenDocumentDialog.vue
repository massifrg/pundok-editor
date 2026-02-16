<script lang="ts">
import { toRaw } from 'vue';
import { mapState } from 'pinia';
import { QTable, QTableColumn, useDialogPluginComponent } from 'quasar';
import {
  DocumentBookmark,
  DocumentFormat,
  Document,
  Folder,
  getPandocFormatDescriptions,
  guessFormat,
  IMAGE_FORMATS,
  ImageFormatDescription,
  imageFormatFromFilename,
  InputConverter,
  OutputConverter,
  PandocFormatDescription,
  Place,
  ProjectBookmark,
  PundokEditorConfigInit,
  PundokEditorProject,
  documentFormatsFromFilename,
  DocumentContext,
  documentFormatIcon,
  FolderContents,
  splitFolderAndDoc,
  changeFileExtensionToFormat,
  documentFormatFromInputConverter,
  documentFormatFromOutputConverter,
  documentFormatFromPandocFormatDescription,
} from '../../common';
import { editorKeyFromState, getEditorConfiguration, getEditorDocState } from '../../schema';
import { useBackend } from '../../stores';
import { uniq } from 'lodash-es';

export type DocumentDialogMode = 'open' | 'save' | 'save-copy' | 'import' | 'include' | 'folder' | 'image'

interface FileContentRow {
  name: string,
  label: string,
  icon?: string,
  isDocument: boolean,
  isFolder: boolean,
}

function isNotHidden(filename: string, platform?: string) {
  return filename === '..' || !filename.startsWith('.')
}

const placeIcons: Record<string, string> = {
  home: 'mdi-folder-home',
  root: 'mdi-folder',
  pictures: 'mdi-folder-image',
  documents: 'mdi-folder-file',
  downloads: 'mdi-folder-download',
  music: 'mdi-folder-music',
  videos: 'mdi-folder-play',
  desktop: 'mdi-folder-table',
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

const imageFormats = IMAGE_FORMATS.map(f => ({ ...f, ftype: 'image' } as DocumentFormat))
const vectorFormats = imageFormats.filter(f => (f as ImageFormatDescription).isVectorial)
const rasterFormats = imageFormats.filter(f => !(f as ImageFormatDescription).isVectorial)
const guessImageFormats = [
  {
    ftype: 'guess',
    name: 'raster image',
    description: 'all raster image formats',
    icon: 'mdi-checkerboard',
    extensions: uniq(rasterFormats.reduce((acc, rf) =>
      [...acc, ...(rf as ImageFormatDescription).extensions], [] as string[]))
  },
  {
    ftype: 'guess',
    name: 'vector image',
    description: 'all vector image formats',
    icon: 'mdi-vector-polygon',
    extensions: uniq(vectorFormats.reduce((acc, vf) =>
      [...acc, ...(vf as ImageFormatDescription).extensions], [] as string[]))
  }
]

export default {
  props: ['editor', 'mode', 'prompt', 'startFilename', 'startFormat', 'startFolder'],
  emits: [...useDialogPluginComponent.emits],
  data() {
    return {
      visible: true,
      /** The protocol of the URL to open (usually it's `file://`) */
      protocol: 'file:',
      /** An array of the folders' names of the current path */
      currentFolder: this.startFolder,
      /** The sub folders in the current folder */
      folders: [] as Folder[],
      /** The documents (files) in the current folder */
      documents: [] as Document[],
      /** The user places in the host OS */
      places: [] as Place[],
      /** The name of the selected document  */
      selectedDocument: undefined as string | undefined,
      /** The name of the file to be saved (or opened) in the text input box */
      filename: this.startFilename || '',
      /** Pagination for QTable */
      pagination: { rowsPerPage: 0 },
      /** The horizontal share (max: 100) for places vs folders/docs */
      splitterValue: 25,
      /** The document(s) that are selected in the QTable */
      selected: [] as FileContentRow[],
      /** The available Pandoc formats and input/output converters */
      pandocFormats: [] as PandocFormatDescription[],
      /** The current, selected format/converter to use to read/save the document */
      format: this.startFormat || guessFormat as DocumentFormat | undefined,
      /** The file extensions to filter the documents */
      extensions: [] as string[],
      /** Bookmarks to recent documents */
      docBookmarks: [] as DocumentBookmark[],
      /** Bookmarks to recent projects */
      projectBookmarks: [] as ProjectBookmark[],
      /** A flag to hide the subfolders in the QTable */
      hideFolders: false,
      /** A flag to show any document with any extension in the QTable */
      showEveryDoc: false,
      /** A flag to show hidden folders and docs too */
      showHidden: false,
      /** A flag to show all the available formats, instead of the main ones */
      showAllFormats: false,
      /** A temporary project, eventually present in the current folder */
      tempProject: undefined as PundokEditorProject | undefined,
      /** A temporary configuration from a bookmarked document */
      tempConfigurationName: undefined as string | undefined,
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    columns() {
      return cols
    },
    rows(): FileContentRow[] {
      const notHiddenFilter = this.showHidden
        ? (() => true)
        : isNotHidden
      const folders = this.hideFolders ? [] : this.folders.map(folder => ({
        name: folder.name,
        label: folder.name,
        icon: 'mdi-folder',
        isFolder: true,
        isDocument: false,
      })).filter(f => notHiddenFilter(f.name))
      let documents = this.documents
        .map(doc => ({
          name: doc.name,
          label: doc.name,
          icon: 'mdi-file-document',
          isFolder: false,
          isDocument: true,
        })).filter(f => notHiddenFilter(f.name))
      // adjust extensions according to the current format
      if (this.format)
        this.selectFormat(this.format)
      if (!this.showEveryDoc && this.extensions.length > 0) {
        const exts = this.extensions.map(e => '.' + e)
        documents = documents.filter(d => !!exts.find(e => d.name.endsWith(e)))
      }
      return [...folders, ...documents]
    },
    isInputDialog() {
      const mode = this.mode as DocumentDialogMode
      return mode !== 'save' && mode !== 'save-copy'
    },
    /**
     * The path returned by this dialog on Ok
     */
    targetPath(): string | undefined {
      if (this.mode === 'folder')
        return this.currentFolder && this.selectedDocument
          ? `${this.currentFolder}/${this.selectedDocument}`
          : undefined
      else
        return this.currentFolder && this.filename
          ? `${this.currentFolder}/${this.filename}`
          : undefined
    },
    dialogPrompt() {
      let prompt = this.prompt
      if (!prompt) {
        switch (this.mode as DocumentDialogMode) {
          case 'save':
            prompt = 'Save document as:'
            break
          case 'save-copy':
            prompt = 'Save a copy as:'
            break
          case 'import':
            prompt = 'Import document:'
            break
          case 'include':
            prompt = 'Include document:'
            break
          case 'open':
          default:
            prompt = 'Open document:'
        }
      }
      return prompt
    },
    configuration() {
      return getEditorConfiguration(this.editor.state)
    },
    tempConfiguration(): PundokEditorConfigInit | undefined {
      return this.tempProject ? this.tempProject.computedConfig : undefined
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
      if (this.mode === 'image') {
        return [...guessImageFormats, ...imageFormats] as DocumentFormat[]
      }
      const docState = getEditorDocState(this.editor)
      const source = this.tempProject?.name || this.tempConfiguration?.name
        || docState?.project?.name || docState?.configuration?.name
      let converters = this.isInputDialog
        ? this.inputConverters.map(ic => documentFormatFromInputConverter(ic, source))
        : this.outputConverters.map(oc => documentFormatFromOutputConverter(oc, source))
      let pandocFormats = this.pandocFormats
        .filter(f => this.isInputDialog ? f.input === true : f.output === true)
        .map(f => documentFormatFromPandocFormatDescription(f))
      if (!this.showAllFormats)
        pandocFormats = pandocFormats.filter(f => ((f as PandocFormatDescription).priority || 0) >= 1)
      let formats = [...converters, ...pandocFormats]
      if (this.isInputDialog && formats[0].ftype !== 'guess')
        formats.unshift(guessFormat)
      return formats
    },
    guess(): DocumentFormat {
      return guessFormat
    },
    guessedFormat() {
      return this.guessFormatFromPath(this.selectedDocument)
    },
    formatDropdownLabel() {
      return this.formatLabel(this.format)
    },
    formatDropdownIcon() {
      return this.formatIcon(this.format)
    },
    formatDropdownTitle() {
      return this.formatTitle(this.format)
    }
  },
  mounted() {
    const getFormatsAndBookmarks = async () => {
      const input_formats: string[] = await this.backend?.pandocFeature('input-formats') || []
      const output_formats: string[] = await this.backend?.pandocFeature('output-formats') || []
      const format_descriptions = getPandocFormatDescriptions(input_formats, output_formats)
      this.pandocFormats = [...format_descriptions]
      this.docBookmarks = (await this.backend?.getBookmarks('document') || []) as DocumentBookmark[]
      this.projectBookmarks = (await this.backend?.getBookmarks('project') || []) as ProjectBookmark[]
    }
    getFormatsAndBookmarks()
  },
  watch: {
    rows(rr: FileContentRow[]) {
      const cf = this.currentFolder + '/'
      if (!rr.find(r => cf + r.label === this.selectedDocument)) {
        this.selected = []
        this.selectedDocument = undefined
      }
    },
    filename(newName, oldName) {
      const sel = this.rows.find(r => r.name === newName)
      this.selected = sel ? [sel] : []
      this.selectedDocument = newName
    },
    tempProject(tp) {
      if (tp) this.tempConfigurationName = undefined
    },
    tempConfiguration(tc) {
      console.log(`temporary configuration: ${tc?.name || 'none'}`)
    },
    tempConfigurationName(tcn) {
      console.log(`temporary configuration name: ${tcn || 'none'}`)
    }
  },
  methods: {
    async getContents() {
      const path = this.currentFolder && `${this.protocol}//${this.currentFolder}` || undefined
      console.log(`getContents, path="${path}"`)
      try {
        const contents: FolderContents | undefined = await this.backend?.getFolderContents({ path })
        const baseUrl = contents?.baseUrl && URL.parse(contents.baseUrl)
        this.protocol = baseUrl ? baseUrl.protocol : this.protocol
        this.currentFolder = baseUrl ? baseUrl.pathname : this.currentFolder
        this.folders = contents?.folders || this.folders
        this.documents = this.mode === 'folder'
          ? []
          : contents?.documents || this.documents
        this.places = contents?.places || this.places
        const tempProject = await this.backend?.getProject({
          path: this.currentFolder,
          computeConfig: true
        })
        if (tempProject) {
          this.tempProject = tempProject
          this.tempConfigurationName = undefined
        }
      } catch (err) {
        this.$q.notify({
          message: 'Error',
          caption: `Can't retrieve folder contents of ${path}: \n${err}`,
          icon: 'mdi-folder-alert',
          position: 'top',
          color: 'negative',
          timeout: 3000,
        });
        console.log(err)
      }
      this.selectedDocument = undefined
    },
    splitFolderAndDoc(path: string) {
      return splitFolderAndDoc(path)
    },
    click(row: FileContentRow) {
      const isFolderMode = this.mode === 'folder'
      const isFolderInFolderMode = isFolderMode && row.isFolder
      const isDocInDocMode = !isFolderMode && row.isDocument
      if (isDocInDocMode || isFolderInFolderMode) {
        this.selectedDocument = row.name
        const sel = this.rows.find(r => r.name === row.name)
        this.selected = sel ? [sel] : []
        this.filename = row.name
      }
      if (isDocInDocMode) {
        this.filename = row.name
        this.fixFormatWhenDifferentExt(row.name)
      }
    },
    doubleClick(row: FileContentRow) {
      if (row.isDocument) {
        this.selectedDocument = row.name
        this.filename = row.name
        this.fixFormatWhenDifferentExt(row.name)
        this.selectDocument()
      } else if (row.isFolder) {
        this.currentFolder = row.name === '..'
          ? splitFolderAndDoc(this.currentFolder).folder
          : this.currentFolder = `${this.currentFolder}/${row.name}`
        this.getContents()
      }
    },
    placeIcon(place: Place) {
      return placeIcons[place.name.toLowerCase()]
        || (place.type === 'disk' && 'mdi-harddisk')
        || 'mdi-folder-arrow-right-outline'
    },
    gotoPlace(place: Place) {
      if (place.href.startsWith('file://')) {
        const url = new URL(place.href)
        this.protocol = url && url.protocol || this.protocol
        this.currentFolder = url && url.pathname || this.currentFolder
        this.getContents()
      }
    },
    selectFormat(format: DocumentFormat, adjustFileExtension?: boolean) {
      this.format = format
      this.extensions = (format as PandocFormatDescription | InputConverter).extensions || []
      if (!this.isInputDialog) this.adjustDocumentExtension(adjustFileExtension)
    },
    fixFormatWhenDifferentExt(path: string) {
      if (!this.extensions.find(e => path.endsWith('.' + e))) {
        const gf = this.guessFormatFromPath(path)
        // console.log(`format should be ${gf?.format?.name}`)
        if (gf?.format) {
          this.$q.notify({
            message: 'Warning',
            caption: `Format set to ${gf.format.name} to match "${path}" extension.`,
            icon: 'mdi-message-alert',
            position: 'top',
            color: 'warning',
            timeout: 3000,
          });
          this.format = gf?.format || this.format
        }
      }
    },
    guessFormatFromPath(path?: string): { format?: DocumentFormat | undefined, why: string } {
      if (this.mode === 'image') {
        if (path) {
          const image_format = imageFormatFromFilename(path)
          if (image_format)
            return {
              format: { ...image_format, ftype: 'image' },
              why: 'from the extension of the file'
            }
        }
      } else {
        if (!path) {
          const json_format = this.pandocFormats.find(f => f.name === 'json')
          return {
            format: { ...json_format, ftype: 'format' },
            why: 'default Pandoc format for the editor'
          }
        }
        if (this.isInputDialog) {
          // try the temporary configuration (for bookmarks)
          if (this.tempConfiguration) {
            const ic = this.tempConfiguration.inputConverters?.find(c => c.default
              && c.extensions.find(e => path.endsWith(`.${e}`)))
            if (ic) return {
              format: { ...toRaw(ic), ftype: 'input-converter' },
              why: 'from the configuration used to open the bookmarked file last time'
            }
          }
          // otherwise try the current configuration
          const ic = this.inputConverters.find(c => c.extensions.find(e => path.endsWith(`.${e}`)))
          if (ic) return {
            format: { ...toRaw(ic), ftype: 'input-converter' },
            why: 'from the current configuration of the editor'
          }
        }
        const formats = documentFormatsFromFilename(
          this.pandocFormats,
          path,
          this.isInputDialog ? 'input' : 'output',
          this.tempConfiguration || this.configuration
        )
        if (formats.length > 0) {
          console.log(formats)
          const pf = formats.find(f => f.extensions?.includes(f.name!))
            || formats[0]
          if (pf)
            return {
              format: { ...pf, ftype: 'format' },
              why: 'from the extension of the file',
            }
        }
      }
      return {
        why: 'no suitable format found'
      }
    },
    documentFormatFromPath(path: string): DocumentFormat | undefined {
      if (!this.format || this.format?.ftype === 'guess') {
        const { format, why } = this.guessFormatFromPath(path)
        return format ? format : undefined
      }
      return this.format
    },
    selectDocument() {
      const editorKey = editorKeyFromState(this.editor.state)
      const path = this.targetPath
      if (editorKey && path) {
        if (this.mode == 'folder') {
          console.log(`folder selected, path=${path}, editorKey=${editorKey}`)
          this.$emit('ok', {
            editorKey,
            path,
            configurationName: this.tempProject ? undefined : this.tempConfigurationName,
            project: this.tempProject,
          } as DocumentContext)
        } else {
          const documentFormat = toRaw(this.format)
          console.log(`document selected, path=${path}, editorKey=${editorKey}, format=${documentFormat.name}`)
          this.$emit('ok', {
            editorKey,
            id: toRaw(this.selectedDocument),
            path,
            documentFormat,
            configurationName: this.tempProject ? undefined : this.tempConfigurationName,
            project: this.tempProject,
          } as DocumentContext)
        }
      }
      this.closeDialog()
    },
    closeDialog() {
      this.$emit('hide')
    },
    formatExtensions(format: DocumentFormat): string[] {
      if (format.ftype === 'output-converter') {
        const ext = ((format as never) as OutputConverter).extension
        return ext ? [ext] : []
      } else {
        return (format as PandocFormatDescription | InputConverter).extensions || []
      }
    },
    formatIcon(format?: DocumentFormat): string {
      let icon
      if (format?.ftype === 'guess') {
        const gf = this.guessedFormat?.format
        icon = gf?.icon
          || format?.icon
          || (gf?.ftype === 'input-converter' && 'mdi-import')
          || (gf?.ftype === 'output-converter' && 'mdi-export')
      }
      return icon || documentFormatIcon(format) || guessFormat.icon || 'mdi-code-tags'
    },
    formatLabel(format?: DocumentFormat) {
      if (format && format.ftype !== 'guess') {
        const { name, source } = format
        return name + (source && source !== 'pandoc' ? ` [${source}]` : '')
      }
      const doc = this.selectedDocument
      if (doc) {
        const { format: format_guess } = this.guessedFormat
        const source = format?.source || format_guess?.source
        const label = (format?.name || 'guess') + (source ? `@${source}` : '')
        return format_guess
          ? `${label} (${format_guess.name})`
          : `${label} (unrecognized)`
      }
      return format?.name || 'guess'
    },
    formatTitle(format?: DocumentFormat) {
      if (format?.ftype !== 'guess')
        return format?.description
      const doc = this.selectedDocument
      if (doc) {
        const { format: format_guess, why } = this.guessedFormat
        if (format_guess)
          return [
            format?.description || '',
            `(${format_guess.name}, ${why})`
          ].join(' ')
      }
      return 'the editor tries to guess the format'
    },
    adjustDocumentExtension(addIfMissing?: boolean) {
      this.filename = changeFileExtensionToFormat(this.filename, this.format, addIfMissing)
    },
    async gotoPath(path: string, configurationName?: string) {
      const { folder, document } = splitFolderAndDoc(path)
      console.log(`folder=${folder}, document=${document}`)
      if (folder.length > 0) {
        this.currentFolder = folder;
        await this.getContents()
        this.selectedDocument = document
        if (document)
          this.scrollToSelectedDocument(document, 500)
        if (configurationName && !this.tempConfiguration) {
          const bookmarkConfig = await this.backend?.configuration(configurationName)
          if (bookmarkConfig) {
            const ic = bookmarkConfig?.inputConverters?.find(ic => ic.default)
            if (ic) {
              this.tempConfigurationName = configurationName
              this.selectFormat({ ...ic, ftype: 'input-converter' })
            }
          }
        }
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
  <q-dialog ref="dialog" v-model="visible" full-width persistent no-esc-dismiss @before-show="getContents()">
    <q-card class="q-dialog-plugin">
      <q-card-section horizontal class="q-pa-sm q-pb-none q-mb-none">
        <span class="bg-info text-body1 q-pa-md">{{ dialogPrompt }}</span>
        <q-input v-if="!isInputDialog" v-model="filename" outlined label="document name"
          @blur="adjustDocumentExtension()" @keyup.enter="selectDocument()" />
        <q-space />
        <span class="q-pa-md">Go to a recent:</span>
        <q-space style="max-width: .1rem;" />
        <q-btn-dropdown label="project" no-caps auto-close dense class="q-my-xs">
          <q-list>
            <q-item v-for="pb in projectBookmarks" clickable @click="gotoPath(pb.url)">
              <q-item-section>{{ pb.name }}</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        &nbsp;
        <q-btn-dropdown label="document" no-caps auto-close dense class="q-my-xs">
          <q-list>
            <q-item v-for="db in docBookmarks" clickable @click="gotoPath(db.url, db.configurationName)">
              <q-item-section>
                <q-item-label :title="db.url">{{ splitFolderAndDoc(db.url).document }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-card-section>
      <q-card-section class="q-px-md q-ma-none">
        <q-splitter v-model="splitterValue" :limits="[10, 50]">
          <template v-slot:after>
            <div class="row q-ma-none q-pa-none">
              <div class="text-body2 self-end">{{ currentFolder }} </div>
              <q-space />
              <q-toggle v-model="showEveryDoc" size="sm"
                title="show every document or just the ones with the matching extensions" label="show all docs:"
                left-label />
              <q-space />
              <q-toggle v-model="showHidden" size="sm" title="hide/show hidden folders/documents" label="show hidden:"
                left-label />
              <q-space v-if="mode !== 'folder'" />
              <q-toggle v-if="mode !== 'folder'" v-model="hideFolders" size="sm" title="hide/show folders"
                label="hide folders:" left-label />
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
          </template>
          <template v-slot:before>
            <q-virtual-scroll class="fit" style="max-height: 50vh" :items="places" separator
              v-slot="{ item: place, index }">
              <q-item :key="index" dense clickable @click="gotoPlace(place)">
                <q-item-section side>
                  <q-icon :name="placeIcon(place)" />
                </q-item-section>
                <q-item-section>
                  <q-item-label> {{ place.name }} </q-item-label>
                </q-item-section>
              </q-item>
            </q-virtual-scroll>
          </template>
        </q-splitter>
      </q-card-section>
      <q-card-section horizontal>
        <div class="q-pa-md">Format/Custom {{ isInputDialog ? 'reader' : 'writer' }}:</div>
        <q-btn-dropdown :label="formatDropdownLabel" :icon="formatDropdownIcon" :title="formatDropdownTitle" auto-close
          no-caps class="q-my-sm">
          <q-list>
            <!-- <q-item :title="guess.description" clickable dense class="bg-brown-2" @click="selectFormat(guess)">
              <q-item-section avatar>
                <q-icon :name="formatIcon(guess)" />
              </q-item-section>
              <q-item-section>{{ guess.name }}</q-item-section>
            </q-item> -->
            <q-item v-for="df in documentFormats" :title="df.description" clickable dense :class="{
              'bg-brown-2': df.ftype === 'guess',
              'bg-teal-2': df.ftype === 'input-converter',
              'bg-amber-2': df.ftype === 'output-converter'
            }" @click="selectFormat(df, true)">
              <q-item-section avatar>
                <q-icon :name="formatIcon(df)" />
              </q-item-section>
              <q-item-section>{{ formatLabel(df) }}</q-item-section>
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
        <q-btn ref="okRef" color="primary" label="OK" :disabled="!targetPath" @click="selectDocument" />
        <q-btn ref="cancelRef" color="primary" label="Cancel" @click="closeDialog" />
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
<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { toRaw } from 'vue';
import { mapState } from 'pinia';
import { useActions } from '../stores'
import { ACTION_SETUP_VIEWER, EditorAction } from '../actions';
import {
  EditorKeyType,
  isProjectDocumentOrDescendant,
  ProjectComponent,
  RenderingBookmark,
  RenderingPageBookmark,
  PdfPageRectangle,
  SYNCTEX_CONTEXT_REQUIRED,
  SetupViewerActionProps,
  SynctexInfo,
  ViewerSetup
} from '../common';
import { isString, throttle } from 'lodash-es';
import { PromptDialog } from './dialogs'

type WhenRendered = (() => void)[]

interface PdfContent {
  filename?: string,
  content?: string,
}

interface ViewerBookmark extends RenderingPageBookmark { }

const baseWidth = 500
const magnifyFactor = 1.1
// const minMagnify = 0.05
// const maxMagnify = 20

function firstPageInSpread(page: number, twoPageSpread: boolean, firstPageOnRight: boolean) {
  if (!twoPageSpread || page === 1) return page
  const pageIsRight = firstPageOnRight
    ? page % 2 === 1
    : page % 2 === 0
  return pageIsRight ? page - 1 : page
}

async function createHash(message: string, algo = 'SHA-1'): Promise<string> {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(algo, new TextEncoder().encode(message))
    ),
    (byte) => byte.toString(16).padStart(2, '0')
  ).join('');
}

export default {
  components: {
    PromptDialog,
  },
  props: ['backend', 'savedDocumentPath', 'savedDocumentProjectPath', 'savedDocumentVersion'],
  data() {
    return {
      filename: undefined as string | undefined,
      projectAsJson: undefined as string | undefined,
      projectPath: undefined as string | undefined,
      projectStructure: undefined as ProjectComponent | undefined,
      autoReload: false,
      page: 1,
      viewPage: 1,
      maxPages: 1,
      magnify: 1,
      width: baseWidth,
      displayedImageSource: undefined as string | undefined,
      displayedPages: [] as { page: number, source: string }[],
      preloadedImages: {} as Record<number, string>,
      pageAspectRatio: 1.414,
      twoPageSpread: false,
      firstPageOnRight: true,
      justEnteredTwoPageSpread: false,
      contentHash: undefined as string | undefined,
      isRendering: false,
      regeneratingUrl: undefined as string | undefined,
      regeneratingTarget: undefined as {
        converterName: string,
        path: string,
      } | undefined,
      whenRendered: [] as WhenRendered,
      div: undefined as HTMLDivElement | undefined,
      scrollTopPerc: 0,
      scrollLeftPerc: 0,
      dragStartX: 0,
      dragStartY: 0,
      dragStartScrollLeft: 0,
      dragStartScrollTop: 0,
      dragging: false,
      documentBookmarks: {} as Record<string, ViewerBookmark[]>,
      currentBookmarkIndex: -1,
      isUpdated: false,
      documentHash: undefined as string | undefined,
      imageVersion: 0,
      renderingJobs: {} as Record<string, RenderingBookmark>,
      editorKey: undefined as EditorKeyType | undefined,
      showPageDialog: false,
      showZoomDialog: false,
      showBookmarkNameDialog: false,
      focusRects: [] as PdfPageRectangle[],
      focusPageHeight: undefined as number | undefined,
      pdfHighlightRects: [] as PdfPageRectangle[],
      pdfHighlightStyles: [] as Record<string, string>[],
      lensSize: 1,
      lensMagnificationFactor: 2,
      lensCtrlDown: false,
      lensVisible: false,
      lensLeft: 0,
      lensTop: 0,
      lensSource: undefined as string | undefined,
      lensBackgroundSize: '',
      lensBackgroundPosition: '',
      lastMouseX: undefined as number | undefined,
      lastMouseY: undefined as number | undefined,
    }
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
    documentKey(): string | undefined {
      return this.documentHash || this.filename
    },
    bookmarks(): ViewerBookmark[] {
      const key = this.documentKey
      if (key) {
        return this.documentBookmarks[key] || []
      }
      return []
    },
    isRegeneratingPdf(): boolean {
      return !!this.regeneratingUrl
    },
    currentRendering(): RenderingBookmark | undefined {
      if (!this.filename) return undefined
      return Object.values(this.renderingJobs).find(
        (item) => this.isPdfRendering(item) &&
          this.renderingPath(item.url) === this.filename,
      )
    },
    renderingBookmarks(): RenderingBookmark[] {
      return Object.values(this.renderingJobs).filter((item) =>
        this.isPdfRendering(item),
      )
    },
    renderingDocumentName(): string {
      const bookmark = this.currentRendering
      if (!bookmark) return ''
      const path = this.renderingPath(bookmark.url)
      return path.split(/[\\/]/).pop() || path
    },
    renderingReloadTitle(): string {
      const bookmark = this.currentRendering
      return bookmark
        ? this.$t('pdfViewer.rerender', { path: bookmark.url })
        : this.$t('pdfViewer.reload')
    },
    lensDiameter(): number {
      return 150 + (this.lensSize - 1) * 50
    },
    pageLayoutOptions() {
      return [
        {
          value: false,
          icon: 'pdf_one_page',
          title: this.$t('pdfViewer.onePageColumn'),
          attrs: { 'data-layout': 'one-column' },
        },
        {
          value: true,
          title: this.twoPageSpread
            ? this.$t(this.firstPageOnRight
              ? 'pdfViewer.twoPageSpreadFirstPageRight'
              : 'pdfViewer.twoPageSpreadFirstPageLeft')
            : this.$t('pdfViewer.twoPageSpread'),
          attrs: { 'data-layout': 'two-page-spread' },
          slot: 'twoPageSpread',
        },
      ]
    },
    imageSource(): string | undefined {
      return this.imageSources[0]?.source
    },
    firstPageInView(): number {
      return firstPageInSpread(this.page, this.twoPageSpread, this.firstPageOnRight)
    },
    displayedPageInView(): number {
      return Math.min(
        firstPageInSpread(this.viewPage, this.twoPageSpread, this.firstPageOnRight),
        this.maxPages,
      )
    },
    pagesToDisplay(): number {
      const viewportHeight = this.div?.clientHeight || 700
      const pageHeight = this.width * this.pageAspectRatio
      const rows = Math.max(1, Math.ceil(viewportHeight / pageHeight))
      const pagesPerRow = this.twoPageSpread ? 2 : 1
      const pages = this.twoPageSpread && this.displayedPageInView === 1 && this.firstPageOnRight
        ? 1 + Math.max(0, rows - 1) * pagesPerRow
        : rows * pagesPerRow
      return Math.min(
        this.maxPages - this.displayedPageInView + 1,
        pages,
      )
    },
    firstPageRightActive(): boolean {
      return this.twoPageSpread && this.firstPageOnRight &&
        this.displayedPages.some((item) => item.page === 1)
    },
    imageSources(): { page: number, source: string }[] {
      const filename = this.filename
      if (!filename) return []
      const version = encodeURIComponent(
        `${this.documentHash || ''}-${this.imageVersion}`,
      )
      const firstPage = this.focusRects.length === 0
        ? this.displayedPageInView
        : firstPageInSpread(this.page, this.twoPageSpread, this.firstPageOnRight)
      const pages = Array.from(
        {
          length: Math.min(this.pagesToDisplay, this.maxPages - firstPage + 1),
        },
        (_, index) => firstPage + index,
      )
      return pages.map((page) => ({
        page,
        source: window.ipc
          ? `img://${filename}?page=${page - 1}&version=${version}`
          : `/backend/image?path=${encodeURIComponent(filename)}&page=${page - 1}&version=${version}`,
      }))
    },
    pendingImageSources(): { page: number, source: string }[] {
      return this.imageSources.filter(
        (requested) => !this.displayedPages.some(
          (displayed) => displayed.page === requested.page &&
            displayed.source === requested.source,
        ),
      )
    },
  },
  watch: {
    savedDocumentVersion() {
      const path = this.savedDocumentPath as string | undefined
      const projectPath = this.savedDocumentProjectPath as string | undefined
      if (!path || !this.autoReload || !this.currentRendering ||
        !this.projectStructure) return
      const { documentPath } = this.currentRendering
      if (isProjectDocumentOrDescendant(
        this.projectStructure,
        documentPath,
        path,
        this.projectPath,
        projectPath,
      ))
        void this.regeneratePdf()
    },
    lastAction(action: EditorAction) {
      if (action.name == ACTION_SETUP_VIEWER.name) {
        console.log(`PDF viewer: setup action "${action.name}"`)
        if (action.editorKey)
          this.editorKey = action.editorKey
        console.log(action)
        this.setupViewer((action.props as SetupViewerActionProps)?.setup)
      }
    },
  },
  created() {
    this.$watch('magnify', throttle((magnify: number) => {
      this.width = baseWidth * magnify
    }, 500))
  },
  mounted() {
    const container = this.$el instanceof HTMLElement
      ? this.$el.querySelector<HTMLDivElement>('.pdf-image-container')
      : undefined
    this.div = container || undefined
    window.addEventListener('keydown', this.lensKeyDown)
    window.addEventListener('keyup', this.lensKeyUp)
    void this.loadRenderingJobs()
  },
  beforeUnmount() {
    window.removeEventListener('keydown', this.lensKeyDown)
    window.removeEventListener('keyup', this.lensKeyUp)
  },
  methods: {
    lensKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Control' || this.lensCtrlDown) return
      this.lensCtrlDown = true
      if (this.lastMouseX !== undefined && this.lastMouseY !== undefined)
        this.updateLens(this.lastMouseX, this.lastMouseY)
    },
    lensKeyUp(e: KeyboardEvent) {
      if (e.key !== 'Control') return
      this.lensCtrlDown = false
      this.lensVisible = false
    },
    updateLens(clientX: number, clientY: number) {
      this.lastMouseX = clientX
      this.lastMouseY = clientY
      if (!this.lensCtrlDown || !this.div) {
        this.lensVisible = false
        return
      }
      const image = Array.from(this.div.querySelectorAll<HTMLImageElement>('.pdf-image'))
        .find((candidate) => {
          const bounds = candidate.getBoundingClientRect()
          return clientX >= bounds.left && clientX <= bounds.right &&
            clientY >= bounds.top && clientY <= bounds.bottom
        })
      if (!image) {
        this.lensVisible = false
        return
      }
      const bounds = image.getBoundingClientRect()
      const imageX = clientX - bounds.left
      const imageY = clientY - bounds.top
      const scaledWidth = bounds.width * this.lensMagnificationFactor
      const scaledHeight = bounds.height * this.lensMagnificationFactor
      const containerBounds = this.div.getBoundingClientRect()
      this.lensLeft = clientX - containerBounds.left + this.div.scrollLeft - this.lensDiameter / 2
      this.lensTop = clientY - containerBounds.top + this.div.scrollTop - this.lensDiameter / 2
      this.lensSource = image.currentSrc || image.src
      this.lensBackgroundSize = `${scaledWidth}px ${scaledHeight}px`
      this.lensBackgroundPosition =
        `${this.lensDiameter / 2 - imageX * this.lensMagnificationFactor}px ` +
        `${this.lensDiameter / 2 - imageY * this.lensMagnificationFactor}px`
      this.lensVisible = true
    },
    lensMouseMoved(e: MouseEvent) {
      this.updateLens(e.clientX, e.clientY)
    },
    lensMouseLeft() {
      this.lastMouseX = undefined
      this.lastMouseY = undefined
      this.lensVisible = false
    },
    mouseMoved(e: MouseEvent) {
      this.dragMoved(e)
      this.lensMouseMoved(e)
    },
    mouseLeft() {
      this.dragEnded()
      this.lensMouseLeft()
    },
    async loadRenderingJobs() {
      const bookmarks = await this.backend?.getBookmarks('rendering') || []
      for (const bookmark of bookmarks as RenderingBookmark[]) {
        if (!this.isPdfRendering(bookmark)) continue
        this.renderingJobs[bookmark.url] = bookmark
        if (bookmark.pageBookmarks)
          this.documentBookmarks[bookmark.url] = bookmark.pageBookmarks
      }
    },
    async setupViewer(setup?: ViewerSetup) {
      if (setup) {
        const {
          name: filename,
          content,
          page,
          magnify,
          centerX,
          centerY,
          projectAsJson,
          documentHash,
          focusRect,
          focusRects,
          focusPageHeight,
        } = setup
        const hash = documentHash || filename
        this.imageVersion += 1
        const rendering = Object.values(this.renderingJobs).find(
          (item) => this.isPdfRendering(item) &&
            this.renderingPath(item.url) === filename,
        )
        const finishedTarget =
          this.regeneratingUrl &&
            this.renderingPath(this.regeneratingUrl) === filename
            ? this.regeneratingTarget
            : undefined
        this.isUpdated = this.documentHash !== hash
        this.documentHash = hash
        this.focusRects = focusRects || (
          focusRect && page
            ? [{ ...focusRect, page, pageHeight: focusPageHeight }]
            : []
        )
        this.focusPageHeight = focusPageHeight
        this.pdfHighlightRects = this.focusRects
        this.pdfHighlightStyles = []
        if (rendering?.pageBookmarks)
          this.documentBookmarks[hash] = rendering.pageBookmarks
        await this.rememberExportJob(hash, filename)
        this.regeneratingUrl = undefined
        this.regeneratingTarget = undefined
        if (finishedTarget)
          this.$emit('rendering-finished', finishedTarget.converterName, finishedTarget.path)
        this.projectAsJson = projectAsJson
        this.projectStructure = undefined
        this.projectPath = undefined
        if (projectAsJson) {
          const project = JSON.parse(projectAsJson)
          this.projectPath = project.path
          this.projectStructure = await this.backend?.getInclusionTree(project)
        }
        if (this.focusRects.length > 0)
          this.whenRendered.push(() => this.focusOnRects())
        if (page) {
          this.page = page
          this.viewPage = page
        }
        await this.loadPdf({ filename, content })
      }
    },
    async rememberExportJob(hash: string, resultPath?: string) {
      if (hash) {
        const job = await this.backend?.getRenderingJob(hash)
        if (job) {
          const renderingPath = resultPath || job.path
          if (!job.converter.longRendering ||
            job.converter.extension !== 'pdf' ||
            !this.isPdfPath(renderingPath))
            return
          const currentEntries = Object.entries(this.renderingJobs).filter(
            ([, item]) => this.isPdfRendering(item) &&
              this.renderingPath(item.url) === renderingPath,
          )
          const current = currentEntries[0]?.[1]
          for (const [key] of currentEntries)
            delete this.renderingJobs[key]
          const url = current?.url || renderingPath
          this.renderingJobs[url] = {
            type: 'rendering',
            url,
            documentPath: job.path,
            converterName: job.converter.name,
            configurationName: job.configurationName,
            pageBookmarks: current?.pageBookmarks,
          }
        }
      }
    },
    async loadPdf(pdf: PdfContent) {
      try {
        const { filename, content } = pdf
        let pdfContent: string | undefined = undefined
        if (filename) {
          if (this.filename !== filename) {
            this.displayedImageSource = undefined
            this.displayedPages = []
            this.preloadedImages = {}
          }
          this.filename = filename
          this.isRendering = true
          this.maxPages = Math.max(1, this.page, this.viewPage)
          this.contentHash = await createHash(filename)
          void this.updatePageCount(filename)
        }
        else if (content) {
          pdfContent = content
          this.$q.notify({
            message: this.$t('pdfViewer.previewRequiresFilePath'),
            color: 'warning',
            icon: 'message_warning',
          })
        }
        if (pdfContent) {
          const contentHash = await createHash(pdfContent)
          if (contentHash !== this.contentHash) {
            this.contentHash = contentHash
            this.isRendering = true
          }
        }
      } catch (err) {
        this.isRendering = false
        this.$q.notify({
          message: err instanceof Error
            ? err.message
            : this.$t('pdfViewer.unableInspectPagesImageMagick'),
          color: 'warning',
          icon: 'message_warning',
        })
      }
    },
    async updatePageCount(filename: string) {
      try {
        const result = await this.backend?.getPdfPageCount(filename)
        if (this.filename === filename && result) {
          this.maxPages = result.pageCount
          this.page = Math.min(this.page, result.pageCount)
          this.viewPage = Math.min(this.viewPage, result.pageCount)
          this.$nextTick(() => this.updateDisplayedPages())
          if (result.usedImageMagick) {
            this.$q.notify({
              message: this.$t('pdfViewer.mtxrunFallback'),
              color: 'warning',
              icon: 'message_warning',
            })
          }
        }
      } catch (err) {
        if (this.filename !== filename) return
        this.$q.notify({
          message: err instanceof Error
            ? err.message
            : this.$t('pdfViewer.unableInspectPagesImageMagick'),
          color: 'warning',
          icon: 'message_warning',
        })
      }
    },
    async regeneratePdf(bookmark?: RenderingBookmark) {
      const rendering = bookmark || this.currentRendering
      if (!rendering || !this.editorKey || !this.backend) return
      this.regeneratingUrl = rendering.url
      try {
        this.regeneratingTarget = {
          converterName: rendering.converterName,
          path: rendering.documentPath,
        }
        this.$emit('rendering-started', rendering.converterName, rendering.documentPath)
        const renderingPayload: RenderingBookmark = {
          type: 'rendering',
          url: rendering.url,
          documentPath: rendering.documentPath,
          converterName: rendering.converterName,
          configurationName: rendering.configurationName,
          pageBookmarks: rendering.pageBookmarks?.map((bookmark) => ({
            label: bookmark.label,
            page: bookmark.page,
            magnify: bookmark.magnify,
            scrollTopPerc: bookmark.scrollTopPerc,
            scrollLeftPerc: bookmark.scrollLeftPerc,
            twoPageSpread: bookmark.twoPageSpread,
            firstPageOnRight: bookmark.firstPageOnRight,
          })),
        }
        await this.backend.renderAgain(renderingPayload, this.editorKey)
        if (this.regeneratingUrl === rendering.url && this.regeneratingTarget) {
          this.$emit(
            'rendering-finished',
            this.regeneratingTarget.converterName,
            this.regeneratingTarget.path,
          )
          this.regeneratingUrl = undefined
          this.regeneratingTarget = undefined
        }
      } catch (err) {
        if (this.regeneratingTarget) {
          this.$emit(
            'rendering-finished',
            this.regeneratingTarget.converterName,
            this.regeneratingTarget.path,
          )
        }
        if (this.regeneratingUrl === rendering.url) this.regeneratingUrl = undefined
        this.regeneratingTarget = undefined
        this.$q.notify({
          message: err instanceof Error ? err.message : this.$t('pdfViewer.unableRegenerate'),
          color: 'negative',
          icon: 'message_warning',
        })
      }
    },
    imageLoaded(e: Event) {
      const image = e.currentTarget as HTMLImageElement
      const source = image.getAttribute('src')
      const page = Number(image.dataset.page)
      const requested = this.imageSources.find((item) => item.page === page)
      if (!source || !requested || source !== requested.source) return
      if (image.naturalWidth)
        this.pageAspectRatio = image.naturalHeight / image.naturalWidth
      this.preloadedImages[page] = source
      this.updateDisplayedPages()
    },
    updateDisplayedPages() {
      if (!this.imageSources.length || !this.imageSources.every(
        (item) => this.preloadedImages[item.page] === item.source,
      )) return
      this.displayedPages = this.imageSources.map((item) => ({
        page: item.page,
        source: item.source,
      }))
      this.displayedImageSource = this.displayedPages[0]?.source
      this.isRendering = false
      this.$nextTick(() => {
        this.updatePdfHighlight()
        const whenRenderedCallback = this.whenRendered.pop()
        if (whenRenderedCallback) whenRenderedCallback()
      })
    },
    pdfRectangleBounds(rect: PdfPageRectangle): { left: number, top: number, right: number, bottom: number } | undefined {
      const div = this.div
      const image = div?.querySelector<HTMLImageElement>(
        `.pdf-image[data-page="${rect.page}"]`,
      )
      if (!div || !image?.naturalWidth || !image.naturalHeight) return undefined

      const pointsToPixels = 150 / 72
      const imageBounds = image.getBoundingClientRect()
      const scale = imageBounds.width / image.naturalWidth
      const pageHeight =
        rect.pageHeight ||
        this.focusPageHeight ||
        image.naturalHeight / pointsToPixels
      const verticalScale = imageBounds.height / pageHeight
      return {
        left: image.offsetLeft + rect.llx * pointsToPixels * scale,
        top: image.offsetTop + rect.lly * verticalScale,
        right: image.offsetLeft + rect.urx * pointsToPixels * scale,
        bottom: image.offsetTop + rect.ury * verticalScale,
      }
    },
    updatePdfHighlight() {
      this.pdfHighlightStyles = this.pdfHighlightRects
        .map((rect) => this.pdfRectangleBounds(rect))
        .filter((bounds): bounds is NonNullable<typeof bounds> => !!bounds)
        .map((bounds) => ({
          left: `${bounds.left}px`,
          top: `${bounds.top}px`,
          width: `${bounds.right - bounds.left}px`,
          height: `${bounds.bottom - bounds.top}px`,
        }))
    },
    focusOnRects() {
      const div = this.div
      if (!div) return

      const bounds = this.focusRects
        .map((rect) => this.pdfRectangleBounds(rect))
        .filter((item): item is NonNullable<typeof item> => !!item)
      if (bounds.length === 0) return
      const left = Math.min(...bounds.map((item) => item.left))
      const top = Math.min(...bounds.map((item) => item.top))
      const right = Math.max(...bounds.map((item) => item.right))
      const bottom = Math.max(...bounds.map((item) => item.bottom))
      const rectWidth = right - left
      const rectHeight = bottom - top
      const viewportWidth = Math.max(1, div.clientWidth - 32)
      const viewportHeight = Math.max(1, div.clientHeight - 32)
      const zoom = Math.min(
        viewportWidth / Math.max(1, rectWidth),
        viewportHeight / Math.max(1, rectHeight),
      ) * 0.8
      const magnify = Math.max(0.05, Math.min(2000, this.magnify * zoom))
      this.setMagnify(magnify)
      this.$nextTick(() => this.scrollToFocusRects())
    },
    scrollToFocusRects() {
      const div = this.div
      if (!div) return
      const bounds = this.focusRects
        .map((rect) => this.pdfRectangleBounds(rect))
        .filter((item): item is NonNullable<typeof item> => !!item)
      if (bounds.length === 0) return
      const centerX =
        (Math.min(...bounds.map((item) => item.left)) +
          Math.max(...bounds.map((item) => item.right))) / 2
      const centerY =
        (Math.min(...bounds.map((item) => item.top)) +
          Math.max(...bounds.map((item) => item.bottom))) / 2
      const top = centerY - div.clientHeight / 2
      const left = centerX - div.clientWidth / 2
      div.scrollTop = Math.max(
        0,
        Math.min(top, div.scrollHeight - div.clientHeight),
      )
      div.scrollLeft = Math.max(
        0,
        Math.min(left, div.scrollWidth - div.clientWidth),
      )
      this.updatePdfHighlight()
    },
    async imageLoadFailed(e: Event) {
      this.isRendering = false
      let message = this.$t('pdfViewer.unableRasterizeImageMagick')
      const image = e.currentTarget as HTMLImageElement
      const source = image.currentSrc || image.getAttribute('src')
      try {
        if (!source) throw new Error('The failed image has no source')
        const response = await fetch(source)
        const error = await response.json().catch(() => undefined)
        if (error?.kind === 'unreadable' ||
          response.headers.get('X-Pundok-Image-Error') === 'unreadable')
          message = this.$t('pdfViewer.unableReadPdf')
      } catch {
        // The image protocol may reject failed requests without a response.
      }
      this.$q.notify({
        message,
        color: 'warning',
        icon: 'message_warning',
      })
    },
    setPage(p: number | string) {
      const page = isString(p) ? parseInt(p) : p
      if (page !== this.page && page >= 1 && page <= this.maxPages) {
        const previousPageInView = this.firstPageInView
        const nextPage = Math.floor(page)
        this.page = nextPage
        if (previousPageInView !== firstPageInSpread(
          nextPage,
          this.twoPageSpread,
          this.firstPageOnRight,
        )) {
          this.viewPage = nextPage
          this.isRendering = true
          this.$nextTick(() => this.updateDisplayedPages())
        }
      }
    },
    firstPage() {
      this.setPage(1)
    },
    prevPage() {
      this.setPage(this.page - 1)
    },
    previousPageClicked(e: Event) {
      if (e instanceof MouseEvent && e.shiftKey) this.firstPage()
      else this.prevPage()
    },
    nextPage() {
      this.setPage(this.page + 1)
    },
    nextPageClicked(e: Event) {
      if (e instanceof MouseEvent && e.shiftKey) this.lastPage()
      else this.nextPage()
    },
    lastPage() {
      this.setPage(this.maxPages)
    },
    validatePage(sp: string) {
      const page_min = 1
      const page_max = this.maxPages
      const p = parseInt(sp)
      return (p >= page_min && p <= page_max)
        || this.$t('pdfViewer.pageRange', { min: page_min, max: page_max })
    },
    setZoom(sp: string) {
      const zoom = parseFloat(sp)
      if (!Number.isNaN(zoom))
        this.setMagnify(zoom / 100)
    },
    validateZoom(sp: string) {
      const zoom_min = 5
      const zoom_max = 199999
      const zoom = parseFloat(sp)
      return (zoom >= zoom_min && zoom <= zoom_max)
        || this.$t('pdfViewer.zoomRange', { min: zoom_min, max: zoom_max })
    },
    setMagnify(magnify: number) {
      if (magnify !== this.magnify && magnify > 0.05 && magnify < 2000) {
        this.magnify = magnify
        this.width = baseWidth * magnify
        this.isRendering = true
        this.$nextTick(() => this.updateDisplayedPages())
      }
    },
    fitLayoutToViewer(twoPageSpread: boolean) {
      const div = this.div
      if (!div) return
      const style = getComputedStyle(div)
      const horizontalPadding =
        parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      const spreadGap = twoPageSpread ? 8 : 0
      const pagesPerRow = twoPageSpread ? 2 : 1
      const availableWidth = div.clientWidth - horizontalPadding - spreadGap
      const pageWidth = Math.max(1, availableWidth / pagesPerRow)
      this.magnify = pageWidth / baseWidth
      this.width = pageWidth
      div.scrollLeft = 0
      div.scrollTop = 0
    },
    displayLayoutChanged(value?: boolean) {
      const layoutChanged = value !== undefined && value !== this.twoPageSpread
      if (value !== undefined) {
        this.twoPageSpread = value
        this.justEnteredTwoPageSpread = value
      }
      if (layoutChanged) this.fitLayoutToViewer(this.twoPageSpread)
      this.viewPage = this.page
      this.isRendering = true
      this.$nextTick(() => this.updateDisplayedPages())
    },
    layoutButtonClicked(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('[data-layout="two-page-spread"]')
      if (!target || !this.twoPageSpread) return
      if (this.justEnteredTwoPageSpread) {
        this.justEnteredTwoPageSpread = false
        return
      }
      this.firstPageOnRight = !this.firstPageOnRight
      this.displayLayoutChanged()
    },
    decreaseScale() {
      this.setMagnify(this.magnify / magnifyFactor)
    },
    increaseScale() {
      this.setMagnify(this.magnify * magnifyFactor)
    },
    resetScale() {
      this.magnify = 1
    },
    decreaseLensSize() {
      this.lensSize = Math.max(1, this.lensSize - 1)
    },
    increaseLensSize() {
      this.lensSize = Math.min(10, this.lensSize + 1)
    },
    decreaseLensMagnification() {
      this.lensMagnificationFactor = Math.max(2, this.lensMagnificationFactor - 0.1)
    },
    increaseLensMagnification() {
      this.lensMagnificationFactor = Math.min(5, this.lensMagnificationFactor + 0.1)
    },
    coordinatesOnRasterImage(e: MouseEvent, image: HTMLImageElement) {
      const { left, top, width, height } = image.getBoundingClientRect()
      return {
        rx: Math.min(1, Math.max(0, (e.clientX - left) / width)),
        ry: Math.min(1, Math.max(0, (e.clientY - top) / height)),
      }
    },
    async doubleClicked(e: MouseEvent) {
      if (!(e.target instanceof HTMLImageElement)) return
      const { rx, ry } = this.coordinatesOnRasterImage(e, e.target)
      const clickedPage = Number(e.target.dataset.page)
      if (this.filename) {
        try {
          const rendering = Object.values(this.renderingJobs).find(
            (item) => this.isPdfRendering(item) &&
              this.renderingPath(item.url) === this.filename,
          )
          await this.backend?.gotoSource(this.editorKey, {
            outputFile: toRaw(this.filename),
            page: clickedPage || toRaw(this.page),
            rx,
            ry,
            projectAsJson: toRaw(this.projectAsJson),
            sourceDocumentPath: rendering?.documentPath,
          } as SynctexInfo)
        } catch (err) {
          const message = err instanceof Error ? err.message : undefined
          this.$q.notify({
            message: message === SYNCTEX_CONTEXT_REQUIRED
              ? this.$t('pdfViewer.synctexRequiresContext')
              : message || this.$t('pdfViewer.unableOpenSource'),
            color: 'warning',
            icon: 'message_warning',
          })
        }
      }
    },
    pageClicked(e: MouseEvent) {
      const image = e.currentTarget
      if (!(image instanceof HTMLImageElement)) return
      const page = Number(image.dataset.page)
      if (page >= 1 && page <= this.maxPages) this.page = page
    },
    dragStarted(e: MouseEvent) {
      if (e.button !== 0) return
      const container = e.currentTarget as HTMLDivElement
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
      this.dragStartScrollLeft = container.scrollLeft
      this.dragStartScrollTop = container.scrollTop
      this.dragging = false
    },
    dragMoved(e: MouseEvent) {
      if (e.buttons !== 1) return
      const container = e.currentTarget as HTMLDivElement
      const dx = e.clientX - this.dragStartX
      const dy = e.clientY - this.dragStartY
      if (!this.dragging && Math.max(Math.abs(dx), Math.abs(dy)) < 3) return
      this.dragging = true
      e.preventDefault()
      container.scrollLeft = this.dragStartScrollLeft - dx
      container.scrollTop = this.dragStartScrollTop - dy
    },
    dragEnded() {
      this.dragging = false
    },
    mouseWheel(e: WheelEvent) {
      e.preventDefault()
      e.stopPropagation()
      const container = e.currentTarget as HTMLDivElement
      if (e.ctrlKey && e.deltaY) {
        const bounds = container.getBoundingClientRect()
        const x = e.clientX - bounds.left + container.scrollLeft
        const y = e.clientY - bounds.top + container.scrollTop
        const oldWidth = this.width
        const factor = e.deltaY < 0 ? magnifyFactor : 1 / magnifyFactor
        this.setMagnify(this.magnify * factor)
        const scale = this.width / oldWidth
        container.scrollLeft = x * scale - (e.clientX - bounds.left)
        container.scrollTop = y * scale - (e.clientY - bounds.top)
        return
      }

      const delta = e.shiftKey ? (e.deltaY || e.deltaX) : e.deltaY
      if (!delta) return
      const horizontal = e.shiftKey
      const position = horizontal ? container.scrollLeft : container.scrollTop
      const maximum = Math.max(0, horizontal
        ? container.scrollWidth - container.clientWidth
        : container.scrollHeight - container.clientHeight)
      const bounds = container.getBoundingClientRect()
      const currentImage = !horizontal
        ? Array.from(container.querySelectorAll<HTMLImageElement>('.pdf-image'))
          .find((image) => Number(image.dataset.page) === this.page)
        : undefined
      const currentImageBounds = currentImage?.getBoundingClientRect()
      const atPageTop = currentImageBounds
        ? currentImageBounds.top >= bounds.top - 1
        : false
      const atPageBottom = currentImageBounds
        ? currentImageBounds.bottom <= bounds.bottom + 1
        : false
      const atEdge = delta < 0
        ? position <= 1 || atPageTop
        : position >= maximum - 1 || atPageBottom
      if (atEdge) {
        if (!horizontal) {
          if (delta < 0) this.prevPage()
          else this.nextPage()
        }
        return
      }
      const nextPosition = Math.min(maximum, Math.max(0, position + delta))
      if (nextPosition !== position) {
        if (horizontal) container.scrollLeft = nextPosition
        else container.scrollTop = nextPosition
        return
      }

      if (!horizontal) {
        if (delta < 0) this.prevPage()
        else this.nextPage()
      }
    },
    pageWheel(e: WheelEvent) {
      if (e.deltaY < 0) {
        this.setPage(this.page + 1)
      } else if (e.deltaY > 0) {
        this.setPage(this.page - 1)
      }
      e.preventDefault()
    },
    zoomWheel(e: WheelEvent) {
      if (e.deltaY < 0) {
        this.increaseScale()
      } else if (e.deltaY > 0) {
        this.decreaseScale()
      }
      e.preventDefault()
    },
    scrolled(e: Event) {
      const div = e.target as HTMLDivElement
      if (div) {
        const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = div
        // console.log(`${(scrollLeft * 100 / scrollWidth).toFixed(0)},${(scrollTop * 100 / scrollHeight).toFixed(0)}`)
        this.div = div
        this.scrollLeftPerc = scrollLeft / Math.max(1, scrollWidth - div.clientWidth)
        this.scrollTopPerc = scrollTop / Math.max(1, scrollHeight - div.clientHeight)
        const bounds = div.getBoundingClientRect()
        const images = Array.from(div.querySelectorAll<HTMLImageElement>('.pdf-image'))
        const visibleImages = images.filter((image) => {
          const imageBounds = image.getBoundingClientRect()
          return imageBounds.bottom > bounds.top && imageBounds.top < bounds.bottom
        })
        const completedImages = visibleImages.filter(
          (image) => image.getBoundingClientRect().bottom <= bounds.bottom + 1,
        )
        const completedImage = completedImages[completedImages.length - 1]
        const currentImage = completedImage || visibleImages[0]
        const page = Number(currentImage?.dataset.page)
        if (page >= 1 && page <= this.maxPages) this.page = page
      }
    },
    setBookmarks(bookmarks: ViewerBookmark[]) {
      const key = this.documentKey
      // console.log(key)
      // console.log(bookmarks)
      if (key)
        this.documentBookmarks[key] = bookmarks
      const rendering = Object.values(this.renderingJobs).find(
        (item) => this.isPdfRendering(item) &&
          this.renderingPath(item.url) === this.filename,
      )
      if (rendering && this.backend)
        void this.updateRenderingBookmark(rendering, bookmarks)
    },
    async updateRenderingBookmark(
      rendering: RenderingBookmark,
      bookmarks: ViewerBookmark[],
    ) {
      const updated: RenderingBookmark = {
        ...toRaw(rendering),
        pageBookmarks: bookmarks.map((bookmark) => ({ ...toRaw(bookmark) })),
      }
      try {
        if (await this.backend?.updateBookmarks([updated]))
          this.renderingJobs[rendering.url] = updated
      } catch (err) {
        console.error('Unable to save rendering page bookmarks', err)
      }
    },
    setBookmark(label?: string) {
      const page = this.page
      this.setBookmarks([
        ...this.bookmarks,
        {
          label: label || `p.${page}`,
          page: page,
          magnify: this.magnify,
          scrollLeftPerc: this.scrollLeftPerc,
          scrollTopPerc: this.scrollTopPerc,
          twoPageSpread: this.twoPageSpread,
          firstPageOnRight: this.firstPageOnRight,
        }
      ])
    },
    removeBookmark(index: number) {
      this.setBookmarks(this.bookmarks.filter((_, i) => i !== index))
    },
    recallBookmark(index: number) {
      const bookmark = this.bookmarks[index]
      if (bookmark) {
        const {
          page,
          magnify,
          scrollLeftPerc,
          scrollTopPerc,
          twoPageSpread,
          firstPageOnRight,
        } = bookmark
        const restoreScroll = () => {
          const div = this.div
          if (div) {
            div.scrollLeft = scrollLeftPerc * Math.max(0, div.scrollWidth - div.clientWidth)
            div.scrollTop = scrollTopPerc * Math.max(0, div.scrollHeight - div.clientHeight)
          }
        }
        this.firstPageOnRight = firstPageOnRight ?? true
        this.page = page
        this.viewPage = page
        this.displayLayoutChanged(twoPageSpread ?? false)
        this.whenRendered.push(restoreScroll)
        this.magnify = magnify
        if (this.displayedPages.some((item) => item.page === this.page)) {
          this.whenRendered.pop()
          setTimeout(restoreScroll, 550)
        }
      }
    },
    editBookmark(index: number) {
      this.currentBookmarkIndex = index
      this.showBookmarkNameDialog = true
    },
    setBookmarkLabel(label: string) {
      const index = this.currentBookmarkIndex
      if (index >= 0) {
        const bookmarks = this.bookmarks.map((bm, i) => {
          if (i === index)
            return { ...bm, label }
          else
            return bm
        })
        this.setBookmarks(bookmarks)
      }
    },
    stopEditingBookmark() {
      this.showBookmarkNameDialog = false
      this.currentBookmarkIndex = -1
    },
    renderingPath(url: string) {
      return decodeURIComponent(url.replace(/^file:\/\//, ''))
    },
    isPdfPath(path: string) {
      return path.toLowerCase().endsWith('.pdf')
    },
    isPdfRendering(bookmark: RenderingBookmark) {
      return this.isPdfPath(this.renderingPath(bookmark.url))
    },
    async showAgain(bookmark: RenderingBookmark) {
      try {
        await this.setupViewer({
          name: this.renderingPath(bookmark.url),
          content: '',
          documentHash: bookmark.url,
        })
      } catch (err) {
        this.$q.notify({
          message: err instanceof Error ? err.message : this.$t('pdfViewer.unableRecallRendering'),
          color: 'negative',
          icon: 'message_warning',
        })
      }
    }
  }
}
</script>

<template>
  <q-card class="lazy-component-wrapper" @wheel="(e: Event) => { e.preventDefault() }">
    <q-card-actions>
      <q-btn size="sm" icon='page_left' :title="$t('pdfViewer.previousPage')" :disabled="page <= 1"
        @click="previousPageClicked" />
      <q-chip :label="`${page}/${maxPages}`" size="md" @wheel="pageWheel" clickable
        @click.stop="showPageDialog = true" />
      <PromptDialog :visible="showPageDialog" :label="$t('pdfViewer.goToPage')" :start-value="page.toString()"
        :validate="validatePage" @set-value="setPage" @close-dialog="showPageDialog = false" />
      <q-btn size="sm" icon='page_right' :title="$t('pdfViewer.nextPage')" :disabled="page >= maxPages"
        @click="nextPageClicked" />
      <q-chip :label="(magnify * 100).toFixed(0) + '%'" size="md" clickable :title="$t('pdfViewer.setZoom')"
        @wheel="zoomWheel" @click.stop="showZoomDialog = true" />
      <PromptDialog :visible="showZoomDialog" :label="$t('pdfViewer.setZoom')" :start-value="(magnify * 100).toFixed(0)"
        :validate="validateZoom" @set-value="setZoom" @close-dialog="showZoomDialog = false" />
      <q-btn-toggle :model-value="twoPageSpread" dense :options="pageLayoutOptions"
        @update:model-value="displayLayoutChanged" @click="layoutButtonClicked">
        <template #twoPageSpread>
          <q-icon name="pdf_two_pages" :class="{ 'pdf-two-pages-left': twoPageSpread && !firstPageOnRight }" />
        </template>
      </q-btn-toggle>
      <q-space />
      <q-btn v-if="bookmarks.length === 0" size="sm" icon="bookmark_add" :title="$t('pdfViewer.addBookmark')"
        @click="setBookmark()" />
      <q-btn-dropdown v-if="bookmarks.length > 0" size="sm" split icon="bookmark_add"
        :title="$t('pdfViewer.addBookmark')" @click="setBookmark()">
        <q-list>
          <q-item v-for="(bookmark, i) in bookmarks" clickable v-close-popup :label="bookmark.label"
            @click="recallBookmark(i)">
            <q-item-section side :title="$t('pdfViewer.editBookmark')"><q-icon name="bookmark_edit" color="primary"
                @click="editBookmark(i)" /></q-item-section>
            <q-item-section :title="$t('pdfViewer.removeBookmark')"><q-item-label>{{ bookmark.label
                }}</q-item-label></q-item-section>
            <q-item-section side :title="$t('pdfViewer.removeBookmark')"><q-icon name="bookmark_remove" color="primary"
                @click="removeBookmark(i)" /></q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <PromptDialog :visible="showBookmarkNameDialog" :label="$t('pdfViewer.renameBookmark')"
        :start-value="bookmarks[currentBookmarkIndex]?.label" @set-value="setBookmarkLabel"
        @close-dialog="showBookmarkNameDialog = false" />
      <q-space />
      <q-btn-dropdown split size="sm" icon="reload" :label="renderingDocumentName" :loading="isRegeneratingPdf"
        :disable="isRegeneratingPdf || renderingBookmarks.length === 0"
        :disable-main-btn="isRegeneratingPdf || !currentRendering" :title="renderingReloadTitle" no-caps
        @click="regeneratePdf(currentRendering)">
        <q-list>
          <q-item v-for="bookmark in renderingBookmarks" :disable="renderingPath(bookmark.url) === filename" clickable
            v-close-popup :title="$t('pdfViewer.reloadBookmark', { url: bookmark.url })" @click="showAgain(bookmark)">
            <q-item-section>
              <q-item-label>{{ bookmark.url }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
      <q-circular-progress :indeterminate="isRendering" :value="isRendering ? 100 : undefined" rounded size="1.4rem"
        color="light-blue" class="q-mx-md q-my-xs q-pa-xs" />
      <q-btn icon="menu" :title="$t('pdfViewer.menu')">
        <q-menu>
          <q-list>
            <q-item tag="label" clickable>
              <q-item-section>
                <q-checkbox v-model="autoReload" :label="$t('pdfViewer.autoReload')"
                  :title="$t('pdfViewer.autoReloadTooltip')" />
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item>
              <q-item-section>
                <q-item-label>
                  {{ $t('pdfViewer.lensSize', { size: lensSize }) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn dense flat round size="sm" icon="remove" :disable="lensSize <= 1"
                  @click.stop="decreaseLensSize" />
              </q-item-section>
              <q-item-section side>
                <q-btn dense flat round size="sm" icon="add" :disable="lensSize >= 10" @click.stop="increaseLensSize" />
              </q-item-section>
            </q-item>
            <q-item>
              <q-item-section>
                <q-item-label>
                  {{ $t('pdfViewer.lensMagnification', { factor: lensMagnificationFactor.toFixed(1) }) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn dense flat round size="sm" icon="remove" :disable="lensMagnificationFactor <= 2"
                  @click.stop="decreaseLensMagnification" />
              </q-item-section>
              <q-item-section side>
                <q-btn dense flat round size="sm" icon="add" :disable="lensMagnificationFactor >= 5"
                  @click.stop="increaseLensMagnification" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </q-card-actions>
    <q-card-section>
      <div class="pdf-image-container q-pa-md"
        :class="{ 'pdf-spread': twoPageSpread, 'pdf-first-page-right': firstPageRightActive, 'pdf-dragging': dragging }"
        @scroll="scrolled" @wheel.stop.prevent="mouseWheel" @mousedown="dragStarted" @mouseup="dragEnded"
        @mouseleave="mouseLeft" @mousemove="mouseMoved">
        <div v-if="isRendering" class="pdf-image-loading">
          <q-circular-progress indeterminate rounded size="3rem" color="light-blue" track-color="grey-4" />
        </div>
        <div v-if="firstPageRightActive" class="pdf-spread-placeholder" :style="{ width: `${width}px` }" />
        <img v-for="displayed in displayedPages" :key="displayed.page"
          :class="{ 'pdf-image': true, 'pdf-current-page': displayed.page === page }" :src="displayed.source"
          :data-page="displayed.page" :style="{ width: `${width}px` }" :alt="$t('pdfViewer.pageImage')"
          @click="pageClicked" @dblclick="doubleClicked" @dragstart.prevent />
        <img v-for="requested in pendingImageSources" :key="`preload-${requested.page}`" class="pdf-image-preload"
          :src="requested.source" :data-page="requested.page" alt="" @load="imageLoaded" @error="imageLoadFailed" />
        <div v-for="(style, index) in pdfHighlightStyles" :key="`pdf-highlight-${index}`" class="pdf-location-highlight"
          :style="style" />
        <div v-if="lensVisible && lensSource" class="pdf-lens" :style="{
          left: `${lensLeft}px`,
          top: `${lensTop}px`,
          width: `${lensDiameter}px`,
          height: `${lensDiameter}px`,
          backgroundImage: `url('${lensSource}')`,
          backgroundSize: lensBackgroundSize,
          backgroundPosition: lensBackgroundPosition,
        }" />
      </div>
    </q-card-section>
  </q-card>
</template>

<style lang="scss">
/** The next one is necessary to prevent the PdfViewer from staying on top even when minified */
.lazy-component-wrapper {
  position: relative !important;
  z-index: auto !important;
}

.pdf-image-container {
  position: relative;
  overflow: scroll;
  width: 100%;
  max-height: 88vh;
  margin-bottom: 4px;
  box-shadow: 0 2px 8px 4px rgba(0, 0, 0, 0.1);
  cursor: crosshair;
  user-select: none;
}

.pdf-location-highlight {
  position: absolute;
  z-index: 1;
  background: rgba(255, 235, 59, 0.3);
  pointer-events: none;
}

.pdf-lens {
  position: absolute;
  z-index: 2;
  border: 2px solid rgba(0, 0, 0, 0.65);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  background-repeat: no-repeat;
  pointer-events: none;
}

.pdf-image-container.pdf-dragging {
  cursor: grabbing;
}

.pdf-image-container.pdf-spread {
  display: grid;
  grid-template-columns: repeat(2, max-content);
  align-content: start;
  column-gap: 8px;
}

.pdf-spread-placeholder {
  display: block;
  height: 1px;
}

.pdf-two-pages-left {
  transform: scaleX(-1);
}

.pdf-image-loading {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.pdf-image {
  display: block;
  margin-bottom: 8px;
  margin-right: 8px;
  box-shadow: 0 2px 8px 4px rgba(0, 255, 0, 0.2);
}

.pdf-image.pdf-current-page {
  box-shadow: 0 2px 8px 4px rgba(0, 7, 134, 0.35);
}

.pdf-image-preload {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>

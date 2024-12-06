<script lang="ts">
const defaultPdf = 'data:application/pdf;base64,' +
  'JVBERi0xLjUKJbXtrvsKNCAwIG9iago8PCAvTGVuZ3RoIDUgMCBSCiAgIC9GaWx0ZXIgL0ZsYXRl' +
  'RGVjb2RlCj4+CnN0cmVhbQp4nH1STW9TMRC8+1fssT3E3V1/rC2hHioKUiUkCu+GeqhIUhES2qZB' +
  '/H3Gfm3yogj8ni177J0dz1qI8c0EQ4niS6mWI33fuGcHzNfQGiYloxltH+jinunhxWlmL8FIVXxV' +
  'JUvt3y5o6dhr4loQlUBmjaekWFnpy0eKPtEfx3SDvnLf7rDJNHeRPtEzSVczjtCgJXhtKYrPprQh' +
  'texrTqRlRNakFYQ6PYItlemRr3SLu9ygr9xpCkvepikCHwFrCmKQjxRRvbwiCUYFaha0qzcVAjOC' +
  'm0At67+NgI//dUmxCZtO5AbOx9dt6iqkoHax5236pRwBRyFruup+oHrIyvkw2Rfn1KSqPVbNvFXr' +
  'LoF0v26WlFdLQr//phcGluyR0SRUxvXJwdsU0gTptvW8sOhqcC0azcL4Tg9Lqz6r1BRIUsS0Fq40' +
  'bNzFcsazpn1YurOn37/mjz9ni/mP3eP2fFi5aD2+1pHusBQws0rB44+KR2ZJszS+s8/vP9Bu8bKj' +
  'Ft/ZZWR/x8xy+Qa+pVwv2rnrwd26v4hfsI4KZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCiAgIDQw' +
  'OAplbmRvYmoKMyAwIG9iago8PAogICAvRXh0R1N0YXRlIDw8CiAgICAgIC9hMCA8PCAvQ0EgMSAv' +
  'Y2EgMSA+PgogICA+PgogICAvRm9udCA8PAogICAgICAvZi0wLTAgNiAwIFIKICAgICAgL2YtMC0x' +
  'IDcgMCBSCiAgID4+Cj4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlICUgMQogICAvUGFy' +
  'ZW50IDEgMCBSCiAgIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NTkxIDg0MS44ODk3NjQgXQogICAv' +
  'Q29udGVudHMgNCAwIFIKICAgL0dyb3VwIDw8CiAgICAgIC9UeXBlIC9Hcm91cAogICAgICAvUyAv' +
  'VHJhbnNwYXJlbmN5CiAgICAgIC9JIHRydWUKICAgICAgL0NTIC9EZXZpY2VSR0IKICAgPj4KICAg' +
  'L1Jlc291cmNlcyAzIDAgUgo+PgplbmRvYmoKOCAwIG9iago8PCAvTGVuZ3RoIDkgMCBSCiAgIC9G' +
  'aWx0ZXIgL0ZsYXRlRGVjb2RlCiAgIC9MZW5ndGgxIDc1NzYKPj4Kc3RyZWFtCnic7Vl9bFvXdT/3' +
  'vsdHSiIpUvySTFt65NOXxSdZNiX5S5ZpUhQlS7Ip2Yr5/CVSoi3HkmM7TlKlWVKnqdtEaeKs6YAg' +
  'aYoALdABS4FLuW7dbkD9T7vMwYD+kW3Y6m1tgQzBkD+CoQuyYZZ2znukLDt2tgHbfyNB3XPPOfee' +
  'c37n3HMfKWAAUA2XQQJ19lzhwq8zb38HoOpjAH509qkn1AE5HANwDgMw/fSFuXMzW2peAHA9AeB2' +
  'zi08ffqNH5zZhzu8i2sSZ04Vik3i+0iHLyOv7wwynNfsb+L8Bs6bz5x7YlFzy3+D89s4H144P1sA' +
  'yH8AsLEZ52PnCosX+Kee3+P8As7VC4+fupDN1P4c56+hfRtwOInjv/Fb6K0dOhJtqCVxkOaAM8aP' +
  'AOdsWkaKHQSwKzYZ1SSvTQnF4t6ItyXijZxkb628wXpX3ue37vTFeRHXc5ha9fBuHoUAaDD/47oq' +
  'bpPZ2KhoyOYSm+xMlqEgKRzg0jjYbKwAjF0cR0vn+YFwIgKSdG7cUlLYg3SMRCgUZNC4MaiFNK+n' +
  '1m23QYAFHK5gjG0LBvyKFm1t04LBQEDzxkPxvr5QVLEH/MH4tr6+3p5Wdnj26aeLAxMhhcu5Yadc' +
  'f2DrZIrvy23d25Th0aWXX3p1S5O3x3dbcoxo3fuPn/TOzved6D/+GMIEB1c/5QFeDz4Yuy4xiVeC' +
  '8tlkzvm5cfQdCgy9ngcMJVTh4pxEVhQMA3Ahywe+qK/Zq7g2xJhXa9MU8rvXG/f60dFeLw8Mu+QN' +
  'x3sKM8aXjDSvv/NRpqPtxGk2vfKDy8WTLATkzxSC3YA4+yB73UNZqviDSEFBtpkYS4yxeUb+gCyf' +
  'GzdFNrZOYiS8DGrdLmeVHRPsYz6lDKVX8/ZoUYVGE0h2JD9zZNEYzGVctg3HefTEmZXvsSPPF0+u' +
  '/DOvH+nYbOZ+O2JUxz/D3Efhjyj3sm0t92h7YS2fl8bXlcJFBGxUbEalyH1KCNz8unogRdS5K+Zc' +
  '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' +
  'FKU2Yv3McRmYnHhx9nBFQK+Ef0n5snJWKbKcPCYP8h6l1Vbl7rjBVq8I+RV8Dhq8ZisqMDiIEP0n' +
  'dK5/MQplbmRzdHJlYW0KZW5kb2JqCjkgMCBvYmoKICAgNDIzMwplbmRvYmoKMTAgMCBvYmoKPDwg' +
  'L0xlbmd0aCAxMSAwIFIKICAgL0ZpbHRlciAvRmxhdGVEZWNvZGUKPj4Kc3RyZWFtCnicXZFNa8Mw' +
  'DIbv/hU6doeSNM0HhRAY3SWHfbBsPyCx5dawOMZxD/n3k63SwQ6JHlt6X2QpO/cvvTUBsg+/yAED' +
  'aGOVx3W5eYkw4cVYcShAGRnup/SX8+hERuJhWwPOvdWLaFvIPim5Br/B7lktEz4JAMjevUJv7AV2' +
  '3+eBr4abcz84ow2Qi64DhZrsXkf3Ns4IWRLve0V5E7Y9yf4qvjaHUKTzgVuSi8LVjRL9aC8o2jzv' +
  'oNW6E2jVv9yhYcmk5XX0om1iaZ5TIK6YK+IaE1MgLpnLyJpZR56YJ+JCJaZA9+xTJ58T8yn6s08T' +
  'fZqCuSCuuIcq9lByTRlrypq5jv5cU6Q+j6w9Rn/J/jI99v6q+Oy4n8c85c17GmVaYpphnJ6x+Niz' +
  'W1xUpe8XBbGWAQplbmRzdHJlYW0KZW5kb2JqCjExIDAgb2JqCiAgIDMwMwplbmRvYmoKMTIgMCBv' +
  'YmoKPDwgL1R5cGUgL0ZvbnREZXNjcmlwdG9yCiAgIC9Gb250TmFtZSAvRFpFSFRTK05vdG9TYW5z' +
  'LVJlZ3VsYXIKICAgL0ZvbnRGYW1pbHkgKE5vdG8gU2FucykKICAgL0ZsYWdzIDMyCiAgIC9Gb250' +
  'QkJveCBbIC02MjEgLTM4OSAyODAwIDEwNjcgXQogICAvSXRhbGljQW5nbGUgMAogICAvQXNjZW50' +
  'IDEwNjkKICAgL0Rlc2NlbnQgLTI5MwogICAvQ2FwSGVpZ2h0IDEwNjcKICAgL1N0ZW1WIDgwCiAg' +
  'IC9TdGVtSCA4MAogICAvRm9udEZpbGUyIDggMCBSCj4+CmVuZG9iago2IDAgb2JqCjw8IC9UeXBl' +
  'IC9Gb250CiAgIC9TdWJ0eXBlIC9UcnVlVHlwZQogICAvQmFzZUZvbnQgL0RaRUhUUytOb3RvU2Fu' +
  'cy1SZWd1bGFyCiAgIC9GaXJzdENoYXIgMzIKICAgL0xhc3RDaGFyIDExNwogICAvRm9udERlc2Ny' +
  'aXB0b3IgMTIgMCBSCiAgIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nCiAgIC9XaWR0aHMgWyAy' +
  'NjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMzIyIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAg' +
  'MCAwIDAgMCAwIDAgMCAwIDAgNzMwIDAgNTE5IDAgMCAwIDAgMCAwIDAgMCAwIDYwNSAwIDAgMCAw' +
  'IDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDYxNSA1NjQgMCAwIDAgMjU4IDAgNTM0IDI1' +
  'OCAwIDYxOCA2MDUgNjE1IDAgNDEzIDQ3OSAzNjEgNjE4IF0KICAgIC9Ub1VuaWNvZGUgMTAgMCBS' +
  'Cj4+CmVuZG9iagoxMyAwIG9iago8PCAvTGVuZ3RoIDE0IDAgUgogICAvRmlsdGVyIC9GbGF0ZURl' +
  'Y29kZQogICAvTGVuZ3RoMSA0OTUyCj4+CnN0cmVhbQp4nK1YTXAcxRV+PTs7q5+VtJJ2JZnxT6/H' +
  'EkY7Kxv/YWxhr2e0Eka2Wcs2zNjG3pVWtgE7iJ8QAflxMASzhDhV5EAlOXAgtxx6pFAxqVRFp1Ri' +
  'LjmQU0gVJBcfqBSHhCJVsZXvzaxkyX+pVLFT2v76va+733v9+vVoSRBRI52nGKUmXnxB7tLNHJE2' +
  'TSTsU1Onz41vaL5AFHufqDV5+uxLp157/7eXMOLn0H9yZrJSXaPe/yVRu4Js2xkIkrOJH6J/Ff11' +
  'Z869MJ1I0hWijiT6qbPPTFQwF7gdK9FPn6tMT2lXU/9EfyP6cuq5yanSSNvv0C9h/jhpdALtv7Ur' +
  'sC5B/YV7wYppFDtNmhDa46Rp4qQOJB4lShhxHbRYe9zozm1uz7b3ZtuzJ8TPrr8rtl7/SLtybdtm' +
  'rUo0P09t8K9Fu0Z9mB/jKCY8tILl4gLk3XS80NYq9FhbQovrhqB4bN+oWlXyCibpeqxCsdjZ/Rri' +
  'Fj9J8fi5/STE0+KAWViB5fV4TH/yFp1faOzs7W1vTxktK3PCasez9YGtW7Zt3tTVnejrs9Yamcxm' +
  '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' +
  '4VLr5mHJRodLMhbZ0ISqPUt00HqJTiG5f/OdGr39MVzVTVGPkop67xeufPJpyq7M4qduohopFgLh' +
  'c1kppkLV8wtTkXDICmVuZHN0cmVhbQplbmRvYmoKMTYgMCBvYmoKICAgMjIzCmVuZG9iagoxNyAw' +
  'IG9iago8PCAvVHlwZSAvRm9udERlc2NyaXB0b3IKICAgL0ZvbnROYW1lIC9EWldCRUsrTm90b1Nh' +
  'bnMtUmVndWxhcgogICAvRm9udEZhbWlseSAoTm90byBTYW5zKQogICAvRmxhZ3MgNAogICAvRm9u' +
  'dEJCb3ggWyAtNjIxIC0zODkgMjgwMCAxMDY3IF0KICAgL0l0YWxpY0FuZ2xlIDAKICAgL0FzY2Vu' +
  'dCAxMDY5CiAgIC9EZXNjZW50IC0yOTMKICAgL0NhcEhlaWdodCAxMDY3CiAgIC9TdGVtViA4MAog' +
  'ICAvU3RlbUggODAKICAgL0ZvbnRGaWxlMiAxMyAwIFIKPj4KZW5kb2JqCjE4IDAgb2JqCjw8IC9U' +
  'eXBlIC9Gb250CiAgIC9TdWJ0eXBlIC9DSURGb250VHlwZTIKICAgL0Jhc2VGb250IC9EWldCRUsr' +
  'Tm90b1NhbnMtUmVndWxhcgogICAvQ0lEU3lzdGVtSW5mbwogICA8PCAvUmVnaXN0cnkgKEFkb2Jl' +
  'KQogICAgICAvT3JkZXJpbmcgKElkZW50aXR5KQogICAgICAvU3VwcGxlbWVudCAwCiAgID4+CiAg' +
  'IC9Gb250RGVzY3JpcHRvciAxNyAwIFIKICAgL1cgWzAgWyA2MDAgNjAyIF1dCj4+CmVuZG9iago3' +
  'IDAgb2JqCjw8IC9UeXBlIC9Gb250CiAgIC9TdWJ0eXBlIC9UeXBlMAogICAvQmFzZUZvbnQgL0Ra' +
  'V0JFSytOb3RvU2Fucy1SZWd1bGFyCiAgIC9FbmNvZGluZyAvSWRlbnRpdHktSAogICAvRGVzY2Vu' +
  'ZGFudEZvbnRzIFsgMTggMCBSXQogICAvVG9Vbmljb2RlIDE1IDAgUgo+PgplbmRvYmoKMSAwIG9i' +
  'ago8PCAvVHlwZSAvUGFnZXMKICAgL0tpZHMgWyAyIDAgUiBdCiAgIC9Db3VudCAxCj4+CmVuZG9i' +
  'agoxOSAwIG9iago8PCAvUHJvZHVjZXIgKGNhaXJvIDEuMTYuMCAoaHR0cHM6Ly9jYWlyb2dyYXBo' +
  'aWNzLm9yZykpCiAgIC9UaXRsZSAoUGFuZG9jIExvZ28pCiAgIC9DcmVhdG9yIDxGRUZGMDA0OTAw' +
  'NkUwMDZCMDA3MzAwNjMwMDYxMDA3MDAwNjUwMDIwMDAzMTAwMkUwMDMyMDAyRTAwMzIwMDIwMDAy' +
  'ODAwNjgwMDc0MDA3NDAwNzAwMDczMDAzQTAwMkYwMDJGMDA2OTAwNkUwMDZCMDA3MzAwNjMwMDYx' +
  'MDA3MDAwNjUwMDJFMDA2RjAwNzIwMDY3MDAyOT4KICAgL0NyZWF0aW9uRGF0ZSAoRDoyMDI0MDkx' +
  'ODE0MjUzOCswMicwMCkKPj4KZW5kb2JqCjIwIDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nCiAgIC9Q' +
  'YWdlcyAxIDAgUgo+PgplbmRvYmoKeHJlZgowIDIxCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAx' +
  'MDE5NyAwMDAwMCBuIAowMDAwMDAwNjUwIDAwMDAwIG4gCjAwMDAwMDA1MjIgMDAwMDAgbiAKMDAw' +
  'MDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwNTAwIDAwMDAwIG4gCjAwMDAwMDU5MTIgMDAwMDAgbiAK' +
  'MDAwMDAxMDAzMSAwMDAwMCBuIAowMDAwMDAwODgyIDAwMDAwIG4gCjAwMDAwMDUyMDkgMDAwMDAg' +
  'biAKMDAwMDAwNTIzMiAwMDAwMCBuIAowMDAwMDA1NjE0IDAwMDAwIG4gCjAwMDAwMDU2MzcgMDAw' +
  'MDAgbiAKMDAwMDAwNjMzOCAwMDAwMCBuIAowMDAwMDA5MTY2IDAwMDAwIG4gCjAwMDAwMDkxOTAg' +
  'MDAwMDAgbiAKMDAwMDAwOTQ5MiAwMDAwMCBuIAowMDAwMDA5NTE1IDAwMDAwIG4gCjAwMDAwMDk3' +
  'OTAgMDAwMDAgbiAKMDAwMDAxMDI2MiAwMDAwMCBuIAowMDAwMDEwNTcwIDAwMDAwIG4gCnRyYWls' +
  'ZXIKPDwgL1NpemUgMjEKICAgL1Jvb3QgMjAgMCBSCiAgIC9JbmZvIDE5IDAgUgo+PgpzdGFydHhy' +
  'ZWYKMTA2MjMKJSVFT0YK'

import VuePdfEmbed from 'vue-pdf-embed'

// optional styles
import 'vue-pdf-embed/dist/styles/annotationLayer.css'
import 'vue-pdf-embed/dist/styles/textLayer.css'
import { mapState } from 'pinia';
import { useActions } from '../stores'
import { ACTION_SETUP_VIEWER, EditorAction } from '../actions';
import { ViewerSetup } from '../common';
import { debounce, throttle } from 'lodash';
import { createBackend } from '../backend';

interface LoadingProgress {
  loaded: number,
  total: number
}

type WhenRendered = (() => void)[]

interface PdfContent {
  filename?: string,
  content?: string,
}

interface ViewerBookmark {
  page: number,
  magnify: number,
  scrollTopPerc: number,
  scrollLeftPerc: number
}

const baseWidth = 500
const magnifyFactor = 1.1
// const minMagnify = 0.05
// const maxMagnify = 20

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
    VuePdfEmbed
  },
  data() {
    return {
      backend: createBackend({ ipc: window.ipc }),
      pdfSource: undefined as string | undefined,
      debouncedPage: 1,
      page: 1,
      maxPages: 1,
      magnify: 1,
      width: baseWidth,
      hash: undefined as string | undefined,
      isRendering: false,
      whenRendered: [] as WhenRendered,
      div: undefined as HTMLDivElement | undefined,
      scrollTopPerc: 0,
      scrollLeftPerc: 0,
      bookmark: undefined as ViewerBookmark | undefined,
    }
  },
  computed: {
    ...mapState(useActions, ['lastAction']),
  },
  watch: {
    lastAction(action: EditorAction) {
      if (action.name == ACTION_SETUP_VIEWER.name) {
        this.setupViewer(action.props?.setup)
      }
    },
  },
  created() {
    this.$watch('magnify', throttle((magnify: number) => {
      this.width = baseWidth * magnify
    }, 500))
    this.$watch('page', debounce((page: number) => {
      this.debouncedPage = page
    }, 200))
  },
  mounted() {
    this.loadDefaultPdf()
  },
  methods: {
    setupViewer(setup?: ViewerSetup) {
      if (setup) {
        const { name: filename, content } = setup
        this.loadPdf({ filename, content })
      }
    },
    async loadPdf(pdf: PdfContent) {
      try {
        const { filename, content } = pdf
        let pdfContent: string | undefined = undefined
        if (filename)
          pdfContent = 'data:application/pdf;base64,' +
            await this.backend?.getFileContents(filename, { base64: true })
        else if (content)
          pdfContent = content
        if (pdfContent) {
          const hash = await createHash(pdfContent)
          if (hash !== this.hash) {
            this.pdfSource = pdfContent
            this.hash = hash
            this.isRendering = true
          }
        }
      } catch (err) {
        alert(err)
      }
    },
    loadDefaultPdf() {
      this.loadPdf({ content: defaultPdf })
    },
    loadingProgress(progress: LoadingProgress) {
      // console.log(progress)
      const { loaded, total } = progress
      if (!this.isRendering && loaded === total) this.isRendering = true
    },
    rendered() {
      this.isRendering = false
      const whenRenderedCallback = this.whenRendered.pop()
      if (whenRenderedCallback) whenRenderedCallback()
    },
    handleFailure(e: object) {
      console.log(e)
    },
    pdfLoaded(loaded: Record<string, any>) {
      const numPages: number | undefined = loaded?._pdfInfo?.numPages
      if (numPages) {
        this.maxPages = numPages
        this.page = this.page > this.maxPages ? 1 : this.page
      }
    },
    setPage(page: number) {
      if (page !== this.page && page >= 1 && page <= this.maxPages) {
        this.page = Math.floor(page)
        this.isRendering = true
      }
    },
    prevPage() {
      this.setPage(this.page - 1)
    },
    nextPage() {
      this.setPage(this.page + 1)
    },
    setMagnify(magnify: number) {
      if (magnify !== this.magnify && magnify > 0.05 && magnify < 2000) {
        this.magnify = magnify
        this.isRendering = true
      }
    },
    decreaseScale() {
      this.setMagnify(this.magnify / magnifyFactor)
    },
    increaseScale() {
      this.setMagnify(this.magnify * magnifyFactor)
    },
    clicked(e: PointerEvent) {
      // console.log(e)
      // const { layerX: x, layerY: y, target } = e
      // const { clientWidth: w, clientHeight: h } = target as HTMLDivElement || { clientWidth: x, clientHeight: y }
      // console.log(`${(x / w).toFixed(2)},${(y / h).toFixed(2)}`)
    },
    mouseWheel(e: WheelEvent) {
      if (e.ctrlKey && !this.isRendering) {
        // console.log(`${e.deltaY}, ${e.clientX}`)
        if (e.deltaY < 0)
          this.increaseScale()
        else if (e.deltaY > 0)
          this.decreaseScale()
      }
    },
    scrolled(e: Event) {
      const div = e.target as HTMLDivElement
      if (div) {
        const { scrollLeft, scrollTop, scrollWidth, scrollHeight } = div
        // console.log(`${(scrollLeft * 100 / scrollWidth).toFixed(0)},${(scrollTop * 100 / scrollHeight).toFixed(0)}`)
        this.div = div
        this.scrollLeftPerc = scrollLeft / scrollWidth
        this.scrollTopPerc = scrollTop / scrollHeight
      }
    },
    setBookmark() {
      this.bookmark = {
        page: this.page,
        magnify: this.magnify,
        scrollLeftPerc: this.scrollLeftPerc,
        scrollTopPerc: this.scrollTopPerc,
      }
    },
    recallBookmark() {
      if (this.bookmark) {
        const { page, magnify, scrollLeftPerc, scrollTopPerc } = this.bookmark
        this.page = page
        this.magnify = magnify
        const div = this.div
        if (div) {
          this.whenRendered.push(() => {
            div.scrollLeft = scrollLeftPerc * div.scrollWidth
            div.scrollTop = scrollTopPerc * div.scrollHeight
          })
        }
      }
    }
  }
}
</script>

<template>
  <q-card>
    <q-card-actions>
      <q-btn label="default pdf" @click="loadDefaultPdf" />
      <q-btn label="load pdf" @click="loadPdf({ filename: 'setup-en.pdf' })" />
      <q-btn label="prev" :disabled="page <= 1" @click="prevPage" />
      <q-badge :label="page" />
      <q-btn label="next" :disabled="page >= maxPages" @click="nextPage" />
      <q-btn icon="mdi-minus" :disabled="magnify < 0.11" @click="decreaseScale" />
      <q-badge :label="(magnify * 100).toFixed(0) + '%'" />
      <q-btn icon="mdi-plus" :disabled="magnify > 9.9" @click="increaseScale" />
      <q-btn icon="mdi-bookmark" @click="setBookmark" />
      <q-btn v-if="bookmark" icon="mdi-bookmark-box" @click="recallBookmark" />
      <q-space />
      <q-circular-progress v-if="isRendering" indeterminate rounded size="1.4rem" color="light-blue"
        class="q-mx-md q-my-xs q-pa-xs" />
    </q-card-actions>
    <q-card-section>
      <div class="vue-pdf-embed-container q-pa-md" @scroll="scrolled">
        <VuePdfEmbed annotation-layer text-layer :scale="1" :page="debouncedPage" :width="width" :source="pdfSource"
          @loaded="pdfLoaded" @progress="loadingProgress" @loading-failed="handleFailure" @rendered="rendered"
          @rendering-failed="handleFailure" @click="clicked" @wheel="mouseWheel" />
      </div>
    </q-card-section>
  </q-card>
</template>

<style lang="scss">
@import 'pdfjs-dist/web/pdf_viewer.css';

.vue-pdf-embed-container {
  overflow: scroll;
  width: 100%;
  max-height: 88vh;
  margin-bottom: 4px;
  box-shadow: 0 2px 8px 4px rgba(0, 0, 0, 0.1);
}

.vue-pdf-embed {
  // margin: auto;
  max-width: 480px;

  &>div canvas {
    margin-bottom: 8px;
    margin-right: 8px;
    box-shadow: 0 2px 8px 4px rgba(0, 255, 0, 0.2);
  }
}
</style>

<template>
  <ToolbarButton icon="mdi-alpha-c-box-outline" title="insert Unicode character" @click="tableVisible = !tableVisible">
    <q-dialog v-model="tableVisible">
      <q-card>
        <q-card-actions>
          <q-select v-model="block" use-input input-debounce="0" label="Unicode block" :options="filteredBlocks"
            size="sm" behavior="menu" dense style="max-width: 180px" @filter="filterBlock"></q-select>
          <q-space style="max-width: 1rem" />
          <q-select v-model="category" use-input input-debounce="0" label="Category" :options="categories" size="sm"
            behavior="menu" dense style="max-width: 240px"></q-select>
          <q-space />
          <q-btn icon="mdi-close" title="close characters table [ESC]" @click="tableVisible = false" size="sm" />
          <br />
          <q-input bottom-slots v-model="searchText" debounce="500" label="search" dense>
            <template v-slot:append>
              <q-icon name="mdi-close" @click="resetSearchText()" class="cursor-pointer" />
            </template>
          </q-input>
          <q-toggle v-model="showAs" checked-icon="mdi-table" color="primary" unchecked-icon="mdi-view-list"
            true-value="table" false-value="list" value="table" :title="`show selection as ${showAs}`" />
        </q-card-actions>
        <q-card-section>
          <q-markup-table dense separator="cell" class="unicode-chars-table">
            <thead />
            <tbody>
              <tr v-for="r in rowsOffsets(stored)" class="q-pa-none q-ma-none">
                <td v-for="c in columns" class="q-pa-none q-ma-none unicode-char-cell">
                  <q-btn v-if="r + c < stored.length" no-caps :label="String.fromCodePoint(stored[r + c].value)"
                    :title="charLabel(stored[r + c])" @click="insertChar(stored[r + c])" size="md" dense flat
                    class="unicode-char-button q-ma-none" />
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>
        <q-card-section>
          <div style="max-width: 70vh; max-height: 50vh; overflow: scroll">
            <q-markup-table v-if="showAs === 'table'" dense separator="cell" class="unicode-chars-table">
              <thead />
              <tbody>
                <tr v-for="r in rowsOffsets(selection)">
                  <td v-for="c in columns" class="q-pa-none q-ma-none unicode-char-cell">
                    <q-btn v-if="r + c < selection.length" no-caps :label="String.fromCodePoint(selection[r + c].value)"
                      :title="charLabel(selection[r + c])" @click="insertChar(selection[r + c])" size="md" dense flat
                      class="unicode-char-button q-ma-none" />
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
            <q-list v-if="showAs === 'list'" dense>
              <q-item v-for="d in selection" clickable @click="insertChar(d)">
                <q-item-section side style="min-width: 3rem">{{ String.fromCodePoint(d.value) }}</q-item-section>
                <q-item-section>{{ charLabel(d) }}</q-item-section>
              </q-item>
            </q-list>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>

<style>
.unicode-char-button {
  min-width: 2rem;
}

.unicode-char-cell {
  text-align: center;
}

.unicode-chars-table {
  border-collapse: collapse;
  border-spacing: 0px;
}
</style>

<script lang="ts">
import { defineComponent, toRaw } from 'vue';
import ToolbarButton from './ToolbarButton.vue';
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import { flatten, isEmpty, range } from 'lodash';
import { setupQuasarIcons } from './helpers/quasarIcons';

interface CharDesc {
  value: number,
  hex_value: string,
  name: string,
  upcase?: number,
  locase?: number,
}

interface BlockDesc {
  first: number,
  last: number,
  description: string
}

interface Option {
  value: string,
  label: string
}

interface BlockOption extends Option {
  first: number,
  last: number
}

const COLUMNS = 8
const MAX_STORED_COUNT = COLUMNS * 2

const MIN_SEARCH_TEXT_LENGTH = 3

const CATEGORIES = [
  'Lu', // Letter, Uppercase
  'Ll', // Letter, Lowercase
  'Lt', // Letter, Titlecase
  'Zs', // Separator, Space
  'Zl', // Separator, Line
  'Zp', // Separator, Paragraph
  'Pc', // Punctuation, Connector
  'Pd', // Punctuation, Dash
  'Ps', // Punctuation, Open
  'Pe', // Punctuation, Close
  'Pi', // Punctuation, Initial quote
  'Pf', // Punctuation, Final quote
  'Po', // Punctuation, Other
  'Nd', // Number, Decimal Digit
  'Nl', // Number, Letter
  'No', // Number, Other
  'Sm', // Symbol, Math
  'Sc', // Symbol, Currency
  'Sk', // Symbol, Modifier
  'So', // Symbol, Other
  'Mn', // Mark, Non-Spacing
  'Mc', // Mark, Spacing Combining
  'Me', // Mark, Enclosing
  'Cc', // Other, Control
  'Cf', // Other, Format
  'Cs', // Other, Surrogate
  'Co', // Other, Private Use
  'Cn', // Other, Not Assigned
  'Lm', // Letter, Modifier
  'Lo', // Letter, Other
]

function blockToBlockOption(blockName: string, b?: BlockDesc): BlockOption {
  const bd = b || blocks[blockName]
  return {
    value: blockName,
    label: bd.description,
    first: bd.first,
    last: bd.last
  }
}

export default defineComponent({
  props: ['editor'],
  components: {
    ToolbarButton,
  },
  data() {
    return {
      showAs: 'table' as 'list' | 'table',
      category: undefined as { value: string, label: string } | undefined,
      block: undefined as BlockOption | undefined,
      selection: [] as CharDesc[],
      tableVisible: false,
      table: {} as Record<string, CharDesc[]>,
      columns: range(COLUMNS),
      searchText: '',
      filteredBlocks: [] as BlockOption[],
      stored: [] as CharDesc[],
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    categories(): Option[] {
      return Object.keys(this.table)
        .map(c => ({ value: c, label: this.catLabel(c) }))
        .sort((c1, c2) => CATEGORIES.indexOf(c1.value) - CATEGORIES.indexOf(c2.value))
    },
    blocks(): BlockOption[] {
      return Object.entries(blocks)
        .sort(([_k1, b1], [_k2, b2]) => b1.first - b2.first)
        .map(([k, b]) => blockToBlockOption(k, b))
    },
    allChars(): CharDesc[] {
      return flatten(Object.values(this.table)).sort((cd1, cd2) => cd1.value - cd2.value)
    },
  },
  watch: {
    tableVisible(newValue) {
      if (newValue && isEmpty(this.table)) {
        this.loadTable()
      }
    },
    category(cat) {
      if (cat) {
        const sel = this.selectionFromCategory(cat)
        if (sel) {
          this.resetBlock()
          this.resetSearchText()
          this.selection = sel
        }
      }
    },
    block(b) {
      if (b) {
        const sel = this.selectionFromBlock(b)
        if (sel) {
          this.resetCategory()
          this.resetSearchText()
          this.selection = sel
        }
      }
    },
    searchText(text: string) {
      if (text && text.length > 0) {
        const sel = this.selectionFromSearchText(text)
        if (sel.length > 0) {
          this.resetCategory()
          this.resetBlock()
          this.selection = sel
        }
      }
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    rowsOffsets(cd: CharDesc[]) {
      return range(Math.ceil(cd.length / COLUMNS)).map(r => r * COLUMNS)
    },
    resetCategory() {
      this.category = undefined
    },
    resetBlock() {
      this.block = undefined
    },
    resetSearchText() {
      this.searchText = ''
    },
    filterBlock(text: string, update: (fn: () => void) => void) {
      if (text === '') {
        update(() => {
          this.filteredBlocks = this.blocks
        })
        return
      }
      update(() => {
        const needle = text.toLowerCase()
        this.filteredBlocks = this.blocks.filter(b => b.label.toLowerCase().indexOf(needle) > -1)
      })
    },
    selectionFromBlock(b: BlockOption): CharDesc[] {
      if (b) {
        let { first, last } = b
        first = first < 32 ? 32 : first
        return this.allChars
          .filter(({ value }) => value >= first && value <= last)
      }
      return []
    },
    selectionFromCategory(cat: Option): CharDesc[] {
      if (cat) {
        const category = this.table[cat.value] || []
        return category.sort((cd1, cd2) => cd1.value - cd2.value)
      }
      return []
    },
    selectionFromSearchText(text: string): CharDesc[] {
      if (text && text.length >= MIN_SEARCH_TEXT_LENGTH) {
        const words = text.toUpperCase().split(/\s+/).filter(w => w.length > 0)
        const sel1 = this.allChars.filter(({ name }) => words.every(w => name.indexOf(w) >= 0))
        const sel2 = sel1.filter(({ name }) => words.every(w => name.match(new RegExp(`\\b${w}\\b`))))
        return sel2.length > 0 ? sel2 : sel1
      }
      return []
    },
    async loadTable() {
      const data = await this.backend?.getFileContents('UnicodeData.txt')
      const table: Record<string, CharDesc[]> = {}
      data?.split(/\n/).forEach(line => {
        let [
          hex_value,
          name,
          cat,
          comb_classes,
          bidi_cat,
          decomp_map,
          dec_value,
          digit_value,
          num_value,
          mirrored,
          name10,
          comment10646,
          upcase_map,
          locase_map,
          titcase_map
        ] = line.split(/;/)
        const value = parseInt(hex_value, 16)
        const upcase = upcase_map?.length > 0 ? parseInt(upcase_map, 16) : undefined
        const locase = locase_map?.length > 0 ? parseInt(locase_map, 16) : undefined
        const desc: CharDesc = {
          value,
          hex_value,
          name,
          upcase,
          locase
        }
        if (cat) {
          if (!table[cat])
            table[cat] = [desc]
          else
            table[cat].push(desc)
        }
      })
      this.table = table
      this.selection = this.selectionFromBlock(blockToBlockOption('basiclatin'))
    },
    catLabel(cat: string) {
      switch (cat) {
        case 'Lu':
          return 'Letter, Uppercase'
        case 'Ll':
          return 'Letter, Lowercase'
        case 'Lt':
          return 'Letter, Titlecase'
        case 'Mn':
          return 'Mark, Non-Spacing'
        case 'Mc':
          return 'Mark, Spacing Combining'
        case 'Me':
          return 'Mark, Enclosing'
        case 'Nd':
          return 'Number, Decimal Digit'
        case 'Nl':
          return 'Number, Letter'
        case 'No':
          return 'Number, Other'
        case 'Zs':
          return 'Separator, Space'
        case 'Zl':
          return 'Separator, Line'
        case 'Zp':
          return 'Separator, Paragraph'
        case 'Cc':
          return 'Other, Control'
        case 'Cf':
          return 'Other, Format'
        case 'Cs':
          return 'Other, Surrogate'
        case 'Co':
          return 'Other, Private Use'
        case 'Cn':
          return 'Other, Not Assigned'
        case 'Lm':
          return 'Letter, Modifier'
        case 'Lo':
          return 'Letter, Other'
        case 'Pc':
          return 'Punctuation, Connector'
        case 'Pd':
          return 'Punctuation, Dash'
        case 'Ps':
          return 'Punctuation, Open'
        case 'Pe':
          return 'Punctuation, Close'
        case 'Pi':
          return 'Punctuation, Initial quote'
        case 'Pf':
          return 'Punctuation, Final quote'
        case 'Po':
          return 'Punctuation, Other'
        case 'Sm':
          return 'Symbol, Math'
        case 'Sc':
          return 'Symbol, Currency'
        case 'Sk':
          return 'Symbol, Modifier'
        case 'So':
          return 'Symbol, Other'
        default:
          return cat
      }
    },
    blockLabel(block_key: string) {
      const block = blocks[block_key]
      return block && block.description || 'Unicode block'
    },
    charLabel(cd: CharDesc) {
      return `U+${cd.hex_value} - ${cd.name}`
    },
    insertChar(cd: CharDesc) {
      const editor = this.editor
      if (editor) {
        const stored = this.stored.filter(s => s !== cd)
        stored.unshift(cd)
        this.stored = stored.slice(0, MAX_STORED_COUNT)
        editor.commands.insertContent(editor.schema.text(String.fromCharCode(cd.value)))
      }
    },
  }
});

const blocks: Record<string, BlockDesc> = {
  adlam: { first: 0x1E900, last: 0x1E95F, description: "Adlam" },
  aegeannumbers: { first: 0x10100, last: 0x1013F, description: "Aegean Numbers" },
  ahom: { first: 0x11700, last: 0x1174F, description: "Ahom" },
  alchemicalsymbols: { first: 0x1F700, last: 0x1F77F, description: "Alchemical Symbols" },
  alphabeticpresentationforms: { first: 0x0FB00, last: 0x0FB4F, description: "Alphabetic Presentation Forms" },
  anatolianhieroglyphs: { first: 0x14400, last: 0x1467F, description: "Anatolian Hieroglyphs" },
  ancientgreekmusicalnotation: { first: 0x1D200, last: 0x1D24F, description: "Ancient Greek Musical Notation" },
  ancientgreeknumbers: { first: 0x10140, last: 0x1018F, description: "Ancient Greek Numbers" },
  ancientsymbols: { first: 0x10190, last: 0x101CF, description: "Ancient Symbols" },
  arabic: { first: 0x00600, last: 0x006FF, description: "Arabic" },
  arabicextendeda: { first: 0x008A0, last: 0x008FF, description: "Arabic Extended-A" },
  arabicextendedb: { first: 0x00870, last: 0x0089F, description: "Arabic Extended-B" },
  arabicextendedc: { first: 0x10EC0, last: 0x10EFF, description: "Arabic Extended-C" },
  arabicmathematicalalphabeticsymbols: { first: 0x1EE00, last: 0x1EEFF, description: "Arabic Mathematical Alphabetic Symbols" },
  arabicpresentationformsa: { first: 0x0FB50, last: 0x0FDFF, description: "Arabic Presentation Forms-A" },
  arabicpresentationformsb: { first: 0x0FE70, last: 0x0FEFF, description: "Arabic Presentation Forms-B" },
  arabicsupplement: { first: 0x00750, last: 0x0077F, description: "Arabic Supplement" },
  armenian: { first: 0x00530, last: 0x0058F, description: "Armenian" },
  arrows: { first: 0x02190, last: 0x021FF, description: "Arrows" },
  avestan: { first: 0x10B00, last: 0x10B3F, description: "Avestan" },
  balinese: { first: 0x01B00, last: 0x01B7F, description: "Balinese" },
  bamum: { first: 0x0A6A0, last: 0x0A6FF, description: "Bamum" },
  bamumsupplement: { first: 0x16800, last: 0x16A3F, description: "Bamum Supplement" },
  basiclatin: { first: 0x00000, last: 0x0007F, description: "Basic Latin" },
  bassavah: { first: 0x16AD0, last: 0x16AFF, description: "Bassa Vah" },
  batak: { first: 0x01BC0, last: 0x01BFF, description: "Batak" },
  bengali: { first: 0x00980, last: 0x009FF, description: "Bengali" },
  bhaiksuki: { first: 0x11C00, last: 0x11C6F, description: "Bhaiksuki" },
  blockelements: { first: 0x02580, last: 0x0259F, description: "Block Elements" },
  bopomofo: { first: 0x03100, last: 0x0312F, description: "Bopomofo" },
  bopomofoextended: { first: 0x031A0, last: 0x031BF, description: "Bopomofo Extended" },
  boxdrawing: { first: 0x02500, last: 0x0257F, description: "Box Drawing" },
  brahmi: { first: 0x11000, last: 0x1107F, description: "Brahmi" },
  braillepatterns: { first: 0x02800, last: 0x028FF, description: "Braille Patterns" },
  buginese: { first: 0x01A00, last: 0x01A1F, description: "Buginese" },
  buhid: { first: 0x01740, last: 0x0175F, description: "Buhid" },
  byzantinemusicalsymbols: { first: 0x1D000, last: 0x1D0FF, description: "Byzantine Musical Symbols" },
  carian: { first: 0x102A0, last: 0x102DF, description: "Carian" },
  caucasianalbanian: { first: 0x10530, last: 0x1056F, description: "Caucasian Albanian" },
  chakma: { first: 0x11100, last: 0x1114F, description: "Chakma" },
  cham: { first: 0x0AA00, last: 0x0AA5F, description: "Cham" },
  cherokee: { first: 0x013A0, last: 0x013FF, description: "Cherokee" },
  cherokeesupplement: { first: 0x0AB70, last: 0x0ABBF, description: "Cherokee Supplement" },
  chesssymbols: { first: 0x1FA00, last: 0x1FA6F, description: "Chess Symbols" },
  chorasmian: { first: 0x10FB0, last: 0x10FDF, description: "Chorasmian" },
  cjkcompatibility: { first: 0x03300, last: 0x033FF, description: "CJK Compatibility" },
  cjkcompatibilityforms: { first: 0x0FE30, last: 0x0FE4F, description: "CJK Compatibility Forms" },
  cjkcompatibilityideographs: { first: 0x0F900, last: 0x0FAFF, description: "CJK Compatibility Ideographs" },
  cjkcompatibilityideographssupplement: { first: 0x2F800, last: 0x2FA1F, description: "CJK Compatibility Ideographs Supplement" },
  cjkradicalssupplement: { first: 0x02E80, last: 0x02EFF, description: "CJK Radicals Supplement" },
  cjkstrokes: { first: 0x031C0, last: 0x031EF, description: "CJK Strokes" },
  cjksymbolsandpunctuation: { first: 0x03000, last: 0x0303F, description: "CJK Symbols and Punctuation" },
  cjkunifiedideographs: { first: 0x04E00, last: 0x09FFF, description: "CJK Unified Ideographs", },
  cjkunifiedideographsextensiona: { first: 0x03400, last: 0x04DBF, description: "CJK Unified Ideographs Extension A" },
  cjkunifiedideographsextensionb: { first: 0x20000, last: 0x2A6DF, description: "CJK Unified Ideographs Extension B" },
  cjkunifiedideographsextensionc: { first: 0x2A700, last: 0x2B73F, description: "CJK Unified Ideographs Extension C" },
  cjkunifiedideographsextensiond: { first: 0x2B740, last: 0x2B81F, description: "CJK Unified Ideographs Extension D" },
  cjkunifiedideographsextensione: { first: 0x2B820, last: 0x2CEAF, description: "CJK Unified Ideographs Extension E" },
  cjkunifiedideographsextensionf: { first: 0x2CEB0, last: 0x2EBEF, description: "CJK Unified Ideographs Extension F" },
  cjkunifiedideographsextensiong: { first: 0x30000, last: 0x3134F, description: "CJK Unified Ideographs Extension G" },
  cjkunifiedideographsextensionh: { first: 0x31350, last: 0x323AF, description: "CJK Unified Ideographs Extension H" },
  cjkunifiedideographsextensioni: { first: 0x2EBF0, last: 0x2EE5F, description: "CJK Unified Ideographs Extension I" },
  combiningdiacriticalmarks: { first: 0x00300, last: 0x0036F, description: "Combining Diacritical Marks" },
  combiningdiacriticalmarksextended: { first: 0x01AB0, last: 0x01AFF, description: "Combining Diacritical Marks Extended" },
  combiningdiacriticalmarksforsymbols: { first: 0x020D0, last: 0x020FF, description: "Combining Diacritical Marks for Symbols" },
  combiningdiacriticalmarkssupplement: { first: 0x01DC0, last: 0x01DFF, description: "Combining Diacritical Marks Supplement" },
  combininghalfmarks: { first: 0x0FE20, last: 0x0FE2F, description: "Combining Half Marks" },
  commonindicnumberforms: { first: 0x0A830, last: 0x0A83F, description: "Common Indic Number Forms" },
  controlpictures: { first: 0x02400, last: 0x0243F, description: "Control Pictures" },
  coptic: { first: 0x02C80, last: 0x02CFF, description: "Coptic" },
  copticepactnumbers: { first: 0x102E0, last: 0x102FF, description: "Coptic Epact Numbers" },
  countingrodnumerals: { first: 0x1D360, last: 0x1D37F, description: "Counting Rod Numerals" },
  cuneiform: { first: 0x12000, last: 0x123FF, description: "Cuneiform" },
  cuneiformnumbersandpunctuation: { first: 0x12400, last: 0x1247F, description: "Cuneiform Numbers and Punctuation" },
  currencysymbols: { first: 0x020A0, last: 0x020CF, description: "Currency Symbols" },
  cypriotsyllabary: { first: 0x10800, last: 0x1083F, description: "Cypriot Syllabary" },
  cyprominoan: { first: 0x12F90, last: 0x12FFF, description: "Cypro-Minoan" },
  cyrillic: { first: 0x00400, last: 0x004FF, description: "Cyrillic" },
  cyrillicextendeda: { first: 0x02DE0, last: 0x02DFF, description: "Cyrillic Extended-A" },
  cyrillicextendedb: { first: 0x0A640, last: 0x0A69F, description: "Cyrillic Extended-B" },
  cyrillicextendedc: { first: 0x01C80, last: 0x01C8F, description: "Cyrillic Extended-C" },
  cyrillicextendedd: { first: 0x1E030, last: 0x1E08F, description: "Cyrillic Extended-D" },
  cyrillicsupplement: { first: 0x00500, last: 0x0052F, description: "Cyrillic Supplement" },
  deseret: { first: 0x10400, last: 0x1044F, description: "Deseret" },
  devanagari: { first: 0x00900, last: 0x0097F, description: "Devanagari" },
  devanagariextended: { first: 0x0A8E0, last: 0x0A8FF, description: "Devanagari Extended" },
  devanagariextendeda: { first: 0x11B00, last: 0x11B5F, description: "Devanagari Extended-A" },
  dingbats: { first: 0x02700, last: 0x027BF, description: "Dingbats" },
  divesakuru: { first: 0x11900, last: 0x1195F, description: "Dives Akuru" },
  dogra: { first: 0x11800, last: 0x1184F, description: "Dogra" },
  dominotiles: { first: 0x1F030, last: 0x1F09F, description: "Domino Tiles" },
  duployan: { first: 0x1BC00, last: 0x1BC9F, description: "Duployan" },
  earlydynasticcuneiform: { first: 0x12480, last: 0x1254F, description: "Early Dynastic Cuneiform" },
  egyptianhieroglyphformatcontrols: { first: 0x13430, last: 0x1345F, description: "Egyptian Hieroglyph Format Controls" },
  egyptianhieroglyphs: { first: 0x13000, last: 0x1342F, description: "Egyptian Hieroglyphs" },
  elbasan: { first: 0x10500, last: 0x1052F, description: "Elbasan" },
  elymaic: { first: 0x10FE0, last: 0x10FFF, description: "Elymaic" },
  emoticons: { first: 0x1F600, last: 0x1F64F, description: "Emoticons" },
  enclosedalphanumerics: { first: 0x02460, last: 0x024FF, description: "Enclosed Alphanumerics" },
  enclosedalphanumericsupplement: { first: 0x1F100, last: 0x1F1FF, description: "Enclosed Alphanumeric Supplement" },
  enclosedcjklettersandmonths: { first: 0x03200, last: 0x032FF, description: "Enclosed CJK Letters and Months" },
  enclosedideographicsupplement: { first: 0x1F200, last: 0x1F2FF, description: "Enclosed Ideographic Supplement" },
  ethiopic: { first: 0x01200, last: 0x0137F, description: "Ethiopic" },
  ethiopicextended: { first: 0x02D80, last: 0x02DDF, description: "Ethiopic Extended" },
  ethiopicextendeda: { first: 0x0AB00, last: 0x0AB2F, description: "Ethiopic Extended-A" },
  ethiopicextendedb: { first: 0x1E7E0, last: 0x1E7FF, description: "Ethiopic Extended-B" },
  ethiopicsupplement: { first: 0x01380, last: 0x0139F, description: "Ethiopic Supplement" },
  generalpunctuation: { first: 0x02000, last: 0x0206F, description: "General Punctuation" },
  geometricshapes: { first: 0x025A0, last: 0x025FF, description: "Geometric Shapes" },
  geometricshapesextended: { first: 0x1F780, last: 0x1F7FF, description: "Geometric Shapes Extended" },
  georgian: { first: 0x010A0, last: 0x010FF, description: "Georgian" },
  georgianextended: { first: 0x01C90, last: 0x01CBF, description: "Georgian Extended" },
  georgiansupplement: { first: 0x02D00, last: 0x02D2F, description: "Georgian Supplement" },
  glagolitic: { first: 0x02C00, last: 0x02C5F, description: "Glagolitic" },
  glagoliticsupplement: { first: 0x1E000, last: 0x1E02F, description: "Glagolitic Supplement" },
  gothic: { first: 0x10330, last: 0x1034F, description: "Gothic" },
  grantha: { first: 0x11300, last: 0x1137F, description: "Grantha" },
  greekandcoptic: { first: 0x00370, last: 0x003FF, description: "Greek and Coptic" },
  greekextended: { first: 0x01F00, last: 0x01FFF, description: "Greek Extended" },
  gujarati: { first: 0x00A80, last: 0x00AFF, description: "Gujarati" },
  gunjalagondi: { first: 0x11D60, last: 0x11DAF, description: "Gunjala Gondi" },
  gurmukhi: { first: 0x00A00, last: 0x00A7F, description: "Gurmukhi" },
  halfwidthandfullwidthforms: { first: 0x0FF00, last: 0x0FFEF, description: "Halfwidth and Fullwidth Forms" },
  hangulcompatibilityjamo: { first: 0x03130, last: 0x0318F, description: "Hangul Compatibility Jamo" },
  hanguljamo: { first: 0x01100, last: 0x011FF, description: "Hangul Jamo" },
  hanguljamoextendeda: { first: 0x0A960, last: 0x0A97F, description: "Hangul Jamo Extended-A" },
  hanguljamoextendedb: { first: 0x0D7B0, last: 0x0D7FF, description: "Hangul Jamo Extended-B" },
  hangulsyllables: { first: 0x0AC00, last: 0x0D7AF, description: "Hangul Syllables" },
  hanifirohingya: { first: 0x10D00, last: 0x10D3F, description: "Hanifi Rohingya" },
  hanunoo: { first: 0x01720, last: 0x0173F, description: "Hanunoo" },
  hatran: { first: 0x108E0, last: 0x108FF, description: "Hatran" },
  hebrew: { first: 0x00590, last: 0x005FF, description: "Hebrew" },
  highprivateusesurrogates: { first: 0x0DB80, last: 0x0DBFF, description: "High Private Use Surrogates" },
  highsurrogates: { first: 0x0D800, last: 0x0DB7F, description: "High Surrogates" },
  hiragana: { first: 0x03040, last: 0x0309F, description: "Hiragana" },
  ideographicdescriptioncharacters: { first: 0x02FF0, last: 0x02FFF, description: "Ideographic Description Characters" },
  ideographicsymbolsandpunctuation: { first: 0x16FE0, last: 0x16FFF, description: "Ideographic Symbols and Punctuation" },
  imperialaramaic: { first: 0x10840, last: 0x1085F, description: "Imperial Aramaic" },
  indicsiyaqnumbers: { first: 0x1EC70, last: 0x1ECBF, description: "Indic Siyaq Numbers" },
  inscriptionalpahlavi: { first: 0x10B60, last: 0x10B7F, description: "Inscriptional Pahlavi" },
  inscriptionalparthian: { first: 0x10B40, last: 0x10B5F, description: "Inscriptional Parthian" },
  ipaextensions: { first: 0x00250, last: 0x002AF, description: "IPA Extensions" },
  javanese: { first: 0x0A980, last: 0x0A9DF, description: "Javanese" },
  kaithi: { first: 0x11080, last: 0x110CF, description: "Kaithi" },
  kaktoviknumerals: { first: 0x1D2C0, last: 0x1D2DF, description: "Kaktovik Numerals" },
  kanaextendeda: { first: 0x1B100, last: 0x1B12F, description: "Kana Extended-A" },
  kanaextendedb: { first: 0x1AFF0, last: 0x1AFFF, description: "Kana Extended-B" },
  kanasupplement: { first: 0x1B000, last: 0x1B0FF, description: "Kana Supplement" },
  kanbun: { first: 0x03190, last: 0x0319F, description: "Kanbun" },
  kangxiradicals: { first: 0x02F00, last: 0x02FDF, description: "Kangxi Radicals" },
  kannada: { first: 0x00C80, last: 0x00CFF, description: "Kannada" },
  katakana: { first: 0x030A0, last: 0x030FF, description: "Katakana" },
  katakanaphoneticextensions: { first: 0x031F0, last: 0x031FF, description: "Katakana Phonetic Extensions" },
  kayahli: { first: 0x0A900, last: 0x0A92F, description: "Kayah Li" },
  kawi: { first: 0x11F00, last: 0x11F5F, description: "Kawi" },
  kharoshthi: { first: 0x10A00, last: 0x10A5F, description: "Kharoshthi" },
  khitansmallscript: { first: 0x18B00, last: 0x18CFF, description: "Khitan Small Script" },
  khmer: { first: 0x01780, last: 0x017FF, description: "Khmer" },
  khmersymbols: { first: 0x019E0, last: 0x019FF, description: "Khmer Symbols" },
  khojki: { first: 0x11200, last: 0x1124F, description: "Khojki" },
  khudawadi: { first: 0x112B0, last: 0x112FF, description: "Khudawadi" },
  lao: { first: 0x00E80, last: 0x00EFF, description: "Lao" },
  latinextendeda: { first: 0x00100, last: 0x0017F, description: "Latin Extended-A" },
  latinextendedadditional: { first: 0x01E00, last: 0x01EFF, description: "Latin Extended Additional" },
  latinextendedb: { first: 0x00180, last: 0x0024F, description: "Latin Extended-B" },
  latinextendedc: { first: 0x02C60, last: 0x02C7F, description: "Latin Extended-C" },
  latinextendedd: { first: 0x0A720, last: 0x0A7FF, description: "Latin Extended-D" },
  latinextendede: { first: 0x0AB30, last: 0x0AB6F, description: "Latin Extended-E" },
  latinextendedf: { first: 0x10780, last: 0x107BF, description: "Latin Extended-F" },
  latinextendedg: { first: 0x1DF00, last: 0x1DFFF, description: "Latin Extended-G" },
  latinsupplement: { first: 0x00080, last: 0x000FF, description: "Latin-1 Supplement" },
  lepcha: { first: 0x01C00, last: 0x01C4F, description: "Lepcha" },
  letterlikesymbols: { first: 0x02100, last: 0x0214F, description: "Letterlike Symbols" },
  limbu: { first: 0x01900, last: 0x0194F, description: "Limbu" },
  lineara: { first: 0x10600, last: 0x1077F, description: "Linear A" },
  linearbideograms: { first: 0x10080, last: 0x100FF, description: "Linear B Ideograms" },
  linearbsyllabary: { first: 0x10000, last: 0x1007F, description: "Linear B Syllabary" },
  lisu: { first: 0x0A4D0, last: 0x0A4FF, description: "Lisu" },
  lisusupplement: { first: 0x11FB0, last: 0x11FBF, description: "Lisu Supplement" },
  lowsurrogates: { first: 0x0DC00, last: 0x0DFFF, description: "Low Surrogates" },
  lycian: { first: 0x10280, last: 0x1029F, description: "Lycian" },
  lydian: { first: 0x10920, last: 0x1093F, description: "Lydian" },
  mahajani: { first: 0x11150, last: 0x1117F, description: "Mahajani" },
  mahjongtiles: { first: 0x1F000, last: 0x1F02F, description: "Mahjong Tiles" },
  makasar: { first: 0x11EE0, last: 0x11EFF, description: "Makasar" },
  malayalam: { first: 0x00D00, last: 0x00D7F, description: "Malayalam" },
  mandaic: { first: 0x00840, last: 0x0085F, description: "Mandaic" },
  manichaean: { first: 0x10AC0, last: 0x10AFF, description: "Manichaean" },
  marchen: { first: 0x11C70, last: 0x11CBF, description: "Marchen" },
  masaramgondi: { first: 0x11D00, last: 0x11D5F, description: "Masaram Gondi" },
  mathematicalalphanumericsymbols: { first: 0x1D400, last: 0x1D7FF, description: "Mathematical Alphanumeric Symbols" },
  mathematicaloperators: { first: 0x02200, last: 0x022FF, description: "Mathematical Operators" },
  mayannumerals: { first: 0x1D2E0, last: 0x1D2FF, description: "Mayan Numerals" },
  medefaidrin: { first: 0x16E40, last: 0x16E9F, description: "Medefaidrin" },
  meeteimayek: { first: 0x0ABC0, last: 0x0ABFF, description: "Meetei Mayek" },
  meeteimayekextensions: { first: 0x0AAE0, last: 0x0AAFF, description: "Meetei Mayek Extensions" },
  mendekikakui: { first: 0x1E800, last: 0x1E8DF, description: "Mende Kikakui" },
  meroiticcursive: { first: 0x109A0, last: 0x109FF, description: "Meroitic Cursive" },
  meroitichieroglyphs: { first: 0x10980, last: 0x1099F, description: "Meroitic Hieroglyphs" },
  miao: { first: 0x16F00, last: 0x16F9F, description: "Miao" },
  miscellaneousmathematicalsymbolsa: { first: 0x027C0, last: 0x027EF, description: "Miscellaneous Mathematical Symbols-A" },
  miscellaneousmathematicalsymbolsb: { first: 0x02980, last: 0x029FF, description: "Miscellaneous Mathematical Symbols-B" },
  miscellaneoussymbols: { first: 0x02600, last: 0x026FF, description: "Miscellaneous Symbols" },
  miscellaneoussymbolsandarrows: { first: 0x02B00, last: 0x02BFF, description: "Miscellaneous Symbols and Arrows" },
  miscellaneoussymbolsandpictographs: { first: 0x1F300, last: 0x1F5FF, description: "Miscellaneous Symbols and Pictographs" },
  miscellaneoustechnical: { first: 0x02300, last: 0x023FF, description: "Miscellaneous Technical" },
  modi: { first: 0x11600, last: 0x1165F, description: "Modi" },
  modifiertoneletters: { first: 0x0A700, last: 0x0A71F, description: "Modifier Tone Letters" },
  mongolian: { first: 0x01800, last: 0x018AF, description: "Mongolian" },
  mongoliansupplement: { first: 0x11660, last: 0x1167F, description: "Mongolian Supplement" },
  mro: { first: 0x16A40, last: 0x16A6F, description: "Mro" },
  multani: { first: 0x11280, last: 0x112AF, description: "Multani" },
  musicalsymbols: { first: 0x1D100, last: 0x1D1FF, description: "Musical Symbols" },
  myanmar: { first: 0x01000, last: 0x0109F, description: "Myanmar" },
  myanmarextendeda: { first: 0x0AA60, last: 0x0AA7F, description: "Myanmar Extended-A" },
  myanmarextendedb: { first: 0x0A9E0, last: 0x0A9FF, description: "Myanmar Extended-B" },
  nabataean: { first: 0x10880, last: 0x108AF, description: "Nabataean" },
  nagmundari: { first: 0x1E4D0, last: 0x1E4FF, description: "Nag Mundari" },
  nandinagari: { first: 0x119A0, last: 0x119FF, description: "Nandinagari" },
  newa: { first: 0x11400, last: 0x1147F, description: "Newa" },
  newtailue: { first: 0x01980, last: 0x019DF, description: "New Tai Lue" },
  nko: { first: 0x007C0, last: 0x007FF, description: "NKo" },
  numberforms: { first: 0x02150, last: 0x0218F, description: "Number Forms" },
  nushu: { first: 0x1B170, last: 0x1B2FF, description: "Nushu" },
  nyiakengpuachuehmong: { first: 0x1E100, last: 0x1E14F, description: "Nyiakeng Puachue Hmong" },
  ogham: { first: 0x01680, last: 0x0169F, description: "Ogham" },
  olchiki: { first: 0x01C50, last: 0x01C7F, description: "Ol Chiki" },
  oldhungarian: { first: 0x10C80, last: 0x10CFF, description: "Old Hungarian" },
  olditalic: { first: 0x10300, last: 0x1032F, description: "Old Italic" },
  oldnortharabian: { first: 0x10A80, last: 0x10A9F, description: "Old North Arabian" },
  oldpermic: { first: 0x10350, last: 0x1037F, description: "Old Permic" },
  oldpersian: { first: 0x103A0, last: 0x103DF, description: "Old Persian" },
  oldsogdian: { first: 0x10F00, last: 0x10F2F, description: "Old Sogdian" },
  oldsoutharabian: { first: 0x10A60, last: 0x10A7F, description: "Old South Arabian" },
  oldturkic: { first: 0x10C00, last: 0x10C4F, description: "Old Turkic" },
  olduyghur: { first: 0x10F70, last: 0x10FAF, description: "Old Uyghur" },
  opticalcharacterrecognition: { first: 0x02440, last: 0x0245F, description: "Optical Character Recognition" },
  oriya: { first: 0x00B00, last: 0x00B7F, description: "Oriya" },
  ornamentaldingbats: { first: 0x1F650, last: 0x1F67F, description: "Ornamental Dingbats" },
  osage: { first: 0x104B0, last: 0x104FF, description: "Osage" },
  osmanya: { first: 0x10480, last: 0x104AF, description: "Osmanya" },
  ottomansiyaqnumbers: { first: 0x1ED00, last: 0x1ED4F, description: "Ottoman Siyaq Numbers" },
  pahawhhmong: { first: 0x16B00, last: 0x16B8F, description: "Pahawh Hmong" },
  palmyrene: { first: 0x10860, last: 0x1087F, description: "Palmyrene" },
  paucinhau: { first: 0x11AC0, last: 0x11AFF, description: "Pau Cin Hau" },
  phagspa: { first: 0x0A840, last: 0x0A87F, description: "Phags-pa" },
  phaistosdisc: { first: 0x101D0, last: 0x101FF, description: "Phaistos Disc" },
  phoenician: { first: 0x10900, last: 0x1091F, description: "Phoenician" },
  phoneticextensions: { first: 0x01D00, last: 0x01D7F, description: "Phonetic Extensions" },
  phoneticextensionssupplement: { first: 0x01D80, last: 0x01DBF, description: "Phonetic Extensions Supplement" },
  playingcards: { first: 0x1F0A0, last: 0x1F0FF, description: "Playing Cards" },
  privateusearea: { first: 0x0E000, last: 0x0F8FF, description: "Private Use Area" },
  psalterpahlavi: { first: 0x10B80, last: 0x10BAF, description: "Psalter Pahlavi" },
  rejang: { first: 0x0A930, last: 0x0A95F, description: "Rejang" },
  ruminumeralsymbols: { first: 0x10E60, last: 0x10E7F, description: "Rumi Numeral Symbols" },
  runic: { first: 0x016A0, last: 0x016FF, description: "Runic" },
  samaritan: { first: 0x00800, last: 0x0083F, description: "Samaritan" },
  saurashtra: { first: 0x0A880, last: 0x0A8DF, description: "Saurashtra" },
  sharada: { first: 0x11180, last: 0x111DF, description: "Sharada" },
  shavian: { first: 0x10450, last: 0x1047F, description: "Shavian" },
  shorthandformatcontrols: { first: 0x1BCA0, last: 0x1BCAF, description: "Shorthand Format Controls" },
  siddham: { first: 0x11580, last: 0x115FF, description: "Siddham" },
  sinhala: { first: 0x00D80, last: 0x00DFF, description: "Sinhala" },
  sinhalaarchaicnumbers: { first: 0x111E0, last: 0x111FF, description: "Sinhala Archaic Numbers" },
  smallformvariants: { first: 0x0FE50, last: 0x0FE6F, description: "Small Form Variants" },
  smallkanaextension: { first: 0x1B130, last: 0x1B16F, description: "Small Kana Extension" },
  sogdian: { first: 0x10F30, last: 0x10F6F, description: "Sogdian" },
  sorasompeng: { first: 0x110D0, last: 0x110FF, description: "Sora Sompeng" },
  soyombo: { first: 0x11A50, last: 0x11AAF, description: "Soyombo" },
  spacingmodifierletters: { first: 0x002B0, last: 0x002FF, description: "Spacing Modifier Letters" },
  specials: { first: 0x0FFF0, last: 0x0FFFF, description: "Specials" },
  sundanese: { first: 0x01B80, last: 0x01BBF, description: "Sundanese" },
  sundanesesupplement: { first: 0x01CC0, last: 0x01CCF, description: "Sundanese Supplement" },
  superscriptsandsubscripts: { first: 0x02070, last: 0x0209F, description: "Superscripts and Subscripts" },
  supplementalarrowsa: { first: 0x027F0, last: 0x027FF, description: "Supplemental Arrows-A" },
  supplementalarrowsb: { first: 0x02900, last: 0x0297F, description: "Supplemental Arrows-B" },
  supplementalarrowsc: { first: 0x1F800, last: 0x1F8FF, description: "Supplemental Arrows-C" },
  supplementalmathematicaloperators: { first: 0x02A00, last: 0x02AFF, description: "Supplemental Mathematical Operators" },
  supplementalpunctuation: { first: 0x02E00, last: 0x02E7F, description: "Supplemental Punctuation" },
  supplementalsymbolsandpictographs: { first: 0x1F900, last: 0x1F9FF, description: "Supplemental Symbols and Pictographs" },
  supplementaryprivateuseareaa: { first: 0xF0000, last: 0xFFFFF, description: "Supplementary Private Use Area-A" },
  supplementaryprivateuseareab: { first: 0x100000, last: 0x10FFFF, description: "Supplementary Private Use Area-B" },
  suttonsignwriting: { first: 0x1D800, last: 0x1DAAF, description: "Sutton SignWriting" },
  sylotinagri: { first: 0x0A800, last: 0x0A82F, description: "Syloti Nagri" },
  symbolsandpictographsextendeda: { first: 0x1FA70, last: 0x1FAFF, description: "Symbols and Pictographs Extended-A" },
  symbolsforlegacycomputing: { first: 0x1FB00, last: 0x1FBFF, description: "Symbols for Legacy Computing" },
  syriac: { first: 0x00700, last: 0x0074F, description: "Syriac" },
  syriacsupplement: { first: 0x00860, last: 0x0086F, description: "Syriac Supplement" },
  tagalog: { first: 0x01700, last: 0x0171F, description: "Tagalog" },
  tagbanwa: { first: 0x01760, last: 0x0177F, description: "Tagbanwa" },
  tags: { first: 0xE0000, last: 0xE007F, description: "Tags" },
  taile: { first: 0x01950, last: 0x0197F, description: "Tai Le" },
  taitham: { first: 0x01A20, last: 0x01AAF, description: "Tai Tham" },
  taiviet: { first: 0x0AA80, last: 0x0AADF, description: "Tai Viet" },
  taixuanjingsymbols: { first: 0x1D300, last: 0x1D35F, description: "Tai Xuan Jing Symbols" },
  takri: { first: 0x11680, last: 0x116CF, description: "Takri" },
  tamil: { first: 0x00B80, last: 0x00BFF, description: "Tamil" },
  tamilsupplement: { first: 0x11FC0, last: 0x11FFF, description: "Tamil Supplement" },
  tangut: { first: 0x17000, last: 0x187FF, description: "Tangut" },
  tangutsupplement: { first: 0x18D00, last: 0x18D7F, description: "Tangut Supplement" },
  tangutcomponents: { first: 0x18800, last: 0x18AFF, description: "Tangut Components" },
  tangsa: { first: 0x16A70, last: 0x16ACF, description: "Tangsa" },
  telugu: { first: 0x00C00, last: 0x00C7F, description: "Telugu" },
  thaana: { first: 0x00780, last: 0x007BF, description: "Thaana" },
  thai: { first: 0x00E00, last: 0x00E7F, description: "Thai" },
  tibetan: { first: 0x00F00, last: 0x00FFF, description: "Tibetan" },
  tifinagh: { first: 0x02D30, last: 0x02D7F, description: "Tifinagh" },
  tirhuta: { first: 0x11480, last: 0x114DF, description: "Tirhuta" },
  toto: { first: 0x1E290, last: 0x1E2BF, description: "Toto" },
  transportandmapsymbols: { first: 0x1F680, last: 0x1F6FF, description: "Transport and Map Symbols" },
  ugaritic: { first: 0x10380, last: 0x1039F, description: "Ugaritic" },
  unifiedcanadianaboriginalsyllabics: { first: 0x01400, last: 0x0167F, description: "Unified Canadian Aboriginal Syllabics" },
  unifiedcanadianaboriginalsyllabicsextended: { first: 0x018B0, last: 0x018FF, description: "Unified Canadian Aboriginal Syllabics Extended" },
  unifiedcanadianaboriginalsyllabicsextendeda: { first: 0x11AB0, last: 0x11ABF, description: "Unified Canadian Aboriginal Syllabics Extended-A" },
  vai: { first: 0x0A500, last: 0x0A63F, description: "Vai" },
  variationselectors: { first: 0x0FE00, last: 0x0FE0F, description: "Variation Selectors" },
  variationselectorssupplement: { first: 0xE0100, last: 0xE01EF, description: "Variation Selectors Supplement" },
  vedicextensions: { first: 0x01CD0, last: 0x01CFF, description: "Vedic Extensions" },
  verticalforms: { first: 0x0FE10, last: 0x0FE1F, description: "Vertical Forms" },
  vithkuqi: { first: 0x10570, last: 0x105BF, description: "Vithkuqi" },
  wancho: { first: 0x1E2C0, last: 0x1E2FF, description: "Wancho" },
  warangciti: { first: 0x118A0, last: 0x118FF, description: "Warang Citi" },
  yezidi: { first: 0x10E80, last: 0x10EBF, description: "Yezidi" },
  yijinghexagramsymbols: { first: 0x04DC0, last: 0x04DFF, description: "Yijing Hexagram Symbols" },
  yiradicals: { first: 0x0A490, last: 0x0A4CF, description: "Yi Radicals" },
  yisyllables: { first: 0x0A000, last: 0x0A48F, description: "Yi Syllables" },
  zanabazarsquare: { first: 0x11A00, last: 0x11A4F, description: "Zanabazar Square" },
  znamennymusicalnotation: { first: 0x1CF00, last: 0x1CFCF, description: "Znamenny Musical Notation" },
}

</script>

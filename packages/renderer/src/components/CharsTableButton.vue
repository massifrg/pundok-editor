<template>
  <ToolbarButton icon="mdi-alpha-c-box-outline" title="insert Unicode character" @click="tableVisible = !tableVisible">
    <q-dialog v-model="tableVisible">
      <q-card>
        <q-card-actions>
          <q-select filled v-model="category" use-input input-debounce="0" label="Category" :options="categories"
            style="width: 250px" behavior="menu"></q-select>
        </q-card-actions>
        <q-card-section>
          <div>
            <q-btn v-for="d in shownChars" :label="String.fromCodePoint(d.value)"
              :title="`U+${d.hex_value} ${d.name}`" />
            <!-- <span v-for="d in shownChars">{{ String.fromCodePoint(d.value) }}</span> -->
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ToolbarButton from './ToolbarButton.vue';
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import { isEmpty } from 'lodash';
import { setupQuasarIcons } from './helpers/quasarIcons';

interface CharDesc {
  value: number,
  hex_value: string,
  name: string,
  upcase?: number,
  locase?: number,
}

export default defineComponent({
  props: ['editor'],
  components: {
    ToolbarButton,
  },
  data() {
    return {
      category: { value: '', label: '' },
      tableVisible: false,
      table: {} as Record<string, CharDesc[]>
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    categories() {
      return Object.keys(this.table).map(c => ({ value: c, label: this.catLabel(c) }))
    },
    shownChars() {
      return this.table[this.category?.value]
    }
  },
  watch: {
    tableVisible(newValue) {
      if (newValue && isEmpty(this.table))
        this.loadTable()
    }
  },
  setup() {
    setupQuasarIcons()
  },
  created() {
    this.loadTable()
  },
  methods: {
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
      console.log(table)
      this.table = table
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
  }
});
</script>

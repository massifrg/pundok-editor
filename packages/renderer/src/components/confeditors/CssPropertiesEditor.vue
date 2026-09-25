<template>
  <div class="css-properties-editor">
    <div class="row items-center q-mb-xs">
      <div class="text-caption">{{ $t('configEditor.cssProperties.title') }}</div>
      <q-space />
      <q-btn dense flat icon="add" :label="$t('configEditor.cssProperties.add')">
        <q-menu>
          <q-list dense>
            <q-item v-for="property in availableProperties" :key="property" clickable v-close-popup
              @click="addProperty(property)">
              <q-item-section>{{ property }}</q-item-section>
            </q-item>
            <q-item v-if="availableProperties.length === 0" disable>
              <q-item-section>{{ $t('configEditor.cssProperties.noneAvailable') }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-btn>
    </div>
    <q-card flat bordered class="q-pa-sm q-mb-sm">
      <div class="text-caption q-mb-xs">{{ $t('configEditor.cssProperties.preview') }}</div>
      <div class="css-specimen" :style="previewStyle">test</div>
    </q-card>
    <q-input v-for="property in selectedProperties" :key="property" :label="property"
      :model-value="propertyValue(property)" outlined dense class="q-mb-sm"
      @update:model-value="setPropertyValue(property, $event)">
      <template #append>
        <q-btn v-if="colorProperties.includes(property)" round flat dense icon="custom_style"
          class="css-color-button"
          :style="{ backgroundColor: propertyValue(property) }"
          :aria-label="$t('configEditor.cssProperties.chooseColor', { property })">
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color :model-value="propertyValue(property)"
              @update:model-value="setPropertyValue(property, $event)" />
          </q-popup-proxy>
        </q-btn>
        <q-btn v-if="borderProperties.includes(property)" round flat dense icon="format_line_style"
          :aria-label="$t('configEditor.cssProperties.chooseLineStyle', { property })">
          <q-tooltip>{{ $t('configEditor.cssProperties.chooseLineStyle', { property }) }}</q-tooltip>
          <q-menu>
            <q-list dense>
              <q-item v-for="borderStyle in borderStyles" :key="borderStyle" clickable v-close-popup
                @click="setBorderStyle(property, borderStyle)">
                <q-item-section>{{ borderStyle }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn v-if="borderProperties.includes(property)" round flat dense icon="custom_style"
          class="css-color-button" :style="{ backgroundColor: borderColor(property) }"
          :aria-label="$t('configEditor.cssProperties.chooseColor', { property })">
          <q-tooltip>{{ $t('configEditor.cssProperties.chooseColor', { property }) }}</q-tooltip>
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color :model-value="borderColor(property)"
              @update:model-value="setBorderColor(property, $event)" />
          </q-popup-proxy>
        </q-btn>
        <q-btn v-if="property === 'font-family'" round flat dense icon="add"
          :aria-label="$t('configEditor.cssProperties.addFontFamily')">
          <q-menu>
            <q-list dense>
              <q-item v-for="fontFamily in genericFontFamilies" :key="fontFamily" clickable v-close-popup
                @click="setPropertyValue(property, fontFamily)">
                <q-item-section>{{ fontFamily }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn v-if="property === 'text-transform'" round flat dense icon="add"
          :aria-label="$t('configEditor.cssProperties.addTextTransform')">
          <q-tooltip>{{ $t('configEditor.cssProperties.addTextTransform') }}</q-tooltip>
          <q-menu>
            <q-list dense>
              <q-item v-for="textTransform in textTransforms" :key="textTransform" clickable v-close-popup
                @click="setPropertyValue(property, textTransform)">
                <q-item-section>{{ textTransform }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn v-if="property === 'font-weight'" round flat dense icon="add"
          :aria-label="$t('configEditor.cssProperties.addFontWeight')">
          <q-tooltip>{{ $t('configEditor.cssProperties.addFontWeight') }}</q-tooltip>
          <q-menu>
            <q-list dense>
              <q-item v-for="fontWeight in fontWeights" :key="fontWeight" clickable v-close-popup
                @click="setPropertyValue(property, fontWeight)">
                <q-item-section>{{ fontWeight }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn v-if="property === 'font-style'" round flat dense icon="add"
          :aria-label="$t('configEditor.cssProperties.addFontStyle')">
          <q-tooltip>{{ $t('configEditor.cssProperties.addFontStyle') }}</q-tooltip>
          <q-menu>
            <q-list dense>
              <q-item v-for="fontStyle in fontStyles" :key="fontStyle" clickable v-close-popup
                @click="setPropertyValue(property, fontStyle)">
                <q-item-section>{{ fontStyle }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn v-if="property === 'font-variant'" round flat dense icon="add"
          :aria-label="$t('configEditor.cssProperties.addFontVariant')">
          <q-tooltip>{{ $t('configEditor.cssProperties.addFontVariant') }}</q-tooltip>
          <q-menu>
            <q-list dense>
              <q-item v-for="fontVariant in fontVariants" :key="fontVariant" clickable v-close-popup
                @click="setPropertyValue(property, fontVariant)">
                <q-item-section>{{ fontVariant }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn round flat dense icon="remove_item"
          :aria-label="$t('configEditor.cssProperties.remove', { property })"
          @click="setPropertyValue(property, null)">
          <q-tooltip>{{ $t('configEditor.cssProperties.remove', { property }) }}</q-tooltip>
        </q-btn>
      </template>
    </q-input>
  </div>
</template>

<script lang="ts">
import { setupQuasarIcons } from '../helpers/quasarIcons'

type SupportedCssProperty =
  | 'color'
  | 'background-color'
  | 'border'
  | 'border-left'
  | 'border-right'
  | 'border-top'
  | 'border-bottom'
  | 'font-variant'
  | 'font-family'
  | 'font-style'
  | 'font-weight'
  | 'font-size'
  | 'text-transform'
type CssProperty = [propertyName: string, propertyValue: string]

const supportedProperties: SupportedCssProperty[] = [
  'color',
  'background-color',
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
  'font-variant',
  'font-family',
  'font-style',
  'font-weight',
  'font-size',
  'text-transform',
]
const colorProperties: SupportedCssProperty[] = ['color', 'background-color']
const borderProperties: SupportedCssProperty[] = [
  'border',
  'border-left',
  'border-right',
  'border-top',
  'border-bottom',
]
const borderStyles = [
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]
const genericFontFamilies = [
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'emoji',
  'math',
  'fangsong',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
]
const textTransforms = [
  'none',
  'capitalize',
  'uppercase',
  'lowercase',
  'full-width',
  'full-size-kana',
  'math-auto',
]
const fontWeights = [
  'normal',
  'bold',
  'lighter',
  'bolder',
  '100',
  '200',
  '300',
  '400',
  '500',
  '600',
  '700',
  '800',
  '900',
]
const fontStyles = ['normal', 'italic', 'oblique']
const fontVariants = [
  'normal',
  'none',
  'small-caps',
  'all-small-caps',
  'petite-caps',
  'all-petite-caps',
  'unicase',
  'titling-caps',
  'common-ligatures',
  'no-common-ligatures',
  'discretionary-ligatures',
  'no-discretionary-ligatures',
  'historical-ligatures',
  'no-historical-ligatures',
  'contextual',
  'no-contextual',
  'ordinal',
  'slashed-zero',
  'lining-nums',
  'oldstyle-nums',
  'proportional-nums',
  'tabular-nums',
  'diagonal-fractions',
  'stacked-fractions',
]

export default {
  props: {
    modelValue: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  computed: {
    cssProperties(): CssProperty[] {
      return this.modelValue as CssProperty[]
    },
    selectedProperties(): SupportedCssProperty[] {
      return supportedProperties.filter(property => this.cssProperties.some(
        ([propertyName]) => propertyName === property,
      ))
    },
    availableProperties(): SupportedCssProperty[] {
      return supportedProperties.filter(property => !this.selectedProperties.includes(property))
    },
    colorProperties(): SupportedCssProperty[] {
      return colorProperties
    },
    borderProperties(): SupportedCssProperty[] {
      return borderProperties
    },
    borderStyles(): string[] {
      return borderStyles
    },
    genericFontFamilies(): string[] {
      return genericFontFamilies
    },
    previewStyle(): Record<string, string> {
      return this.cssProperties.reduce<Record<string, string>>((style, [property, value]) => {
        style[property] = value
        return style
      }, {})
    },
    textTransforms(): string[] {
      return textTransforms
    },
    fontWeights(): string[] {
      return fontWeights
    },
    fontStyles(): string[] {
      return fontStyles
    },
    fontVariants(): string[] {
      return fontVariants
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    propertyValue(property: SupportedCssProperty): string {
      return this.cssProperties.find(([propertyName]) => propertyName === property)?.[1] || ''
    },
    borderColor(property: SupportedCssProperty): string {
      const value = this.propertyValue(property)
      return this.borderColorMatch(value)?.[0] || ''
    },
    setBorderStyle(property: SupportedCssProperty, style: string) {
      const value = this.propertyValue(property)
      const styles = borderStyles.join('|')
      const updated = new RegExp(`\\b(?:${styles})\\b`, 'i').test(value)
        ? value.replace(new RegExp(`\\b(?:${styles})\\b`, 'i'), style)
        : `${style}${value ? ` ${value}` : ''}`
      this.setPropertyValue(property, updated)
    },
    setBorderColor(property: SupportedCssProperty, color: string | number | null) {
      if (!color) return
      const value = this.propertyValue(property)
      const colorMatch = this.borderColorMatch(value)
      const updated = colorMatch && colorMatch.index !== undefined
        ? value.slice(0, colorMatch.index) + String(color)
          + value.slice(colorMatch.index + colorMatch[0].length)
        : `${value}${value ? ' ' : ''}${color}`
      this.setPropertyValue(property, updated)
    },
    borderColorMatch(value: string): RegExpMatchArray | undefined {
      const matches = [...value.matchAll(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]+\b/gi)]
      return matches.reverse().find(match => !borderStyles.includes(match[0].toLowerCase())
        && !['thin', 'medium', 'thick', 'px', 'pt', 'em', 'rem', 'cm', 'mm', 'in', 'pc', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax'].includes(match[0].toLowerCase()))
    },
    setPropertyValue(property: SupportedCssProperty, value: string | number | null) {
      const css = [...this.cssProperties]
      const index = css.findIndex(([propertyName]) => propertyName === property)
      const propertyValue = value === null ? '' : String(value)
      if (propertyValue) {
        const entry: CssProperty = [property, propertyValue]
        if (index < 0) css.push(entry)
        else css.splice(index, 1, entry)
      } else if (index >= 0) {
        css.splice(index, 1)
      }
      this.$emit('update:modelValue', css.length > 0 ? css : undefined)
    },
    addProperty(property: SupportedCssProperty) {
      if (this.selectedProperties.includes(property)) return
      this.$emit('update:modelValue', [...this.cssProperties, [property, '']])
    },
  },
}
</script>

<style scoped>
.css-color-button {
  border: 1px solid var(--q-separator-color);
}

.css-specimen {
  min-height: 2.5rem;
  padding: 0.5rem;
  border: 1px dashed var(--q-separator-color);
}
</style>

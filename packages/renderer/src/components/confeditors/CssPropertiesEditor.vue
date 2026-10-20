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
            <q-separator />
            <q-item clickable v-close-popup @click="openCustomPropertyDialog">
              <q-item-section class="text-italic">
                {{ $t('configEditor.cssProperties.other') }}
              </q-item-section>
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
        <q-select v-if="property === 'text-decoration'" dense outlined options-dense
          multiple emit-value map-options hide-dropdown-icon class="css-decoration-select"
          :label="$t('configEditor.cssProperties.textDecorationLine')"
          :model-value="textDecorationLineValues" :options="textDecorationLineOptions"
          @update:model-value="setTextDecorationLines">
          <template #selected-item="scope">
            <q-chip dense>{{ scope.opt.label }}</q-chip>
          </template>
        </q-select>
        <q-btn v-if="property === 'text-decoration'" round flat dense icon="custom_style"
          class="css-color-button" :style="{ backgroundColor: textDecorationColor || undefined }"
          :aria-label="$t('configEditor.cssProperties.textDecorationColor')">
          <q-tooltip>{{ $t('configEditor.cssProperties.textDecorationColor') }}</q-tooltip>
          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
            <q-color :model-value="textDecorationColor"
              @update:model-value="setTextDecorationColor" />
          </q-popup-proxy>
        </q-btn>
        <q-select v-if="property === 'text-decoration'" dense outlined options-dense
          emit-value map-options hide-dropdown-icon class="css-decoration-select"
          :label="$t('configEditor.cssProperties.textDecorationStyle')"
          :model-value="textDecorationStyle" :options="textDecorationStyles"
          @update:model-value="setTextDecorationStyle" />
        <q-btn v-if="property === 'text-decoration'" dense outline
          no-caps class="css-decoration-thickness"
          :label="textDecorationThicknessLabel"
          :aria-label="$t('configEditor.cssProperties.textDecorationThickness')">
          <q-menu>
            <div class="q-pa-md css-decoration-thickness-menu">
              <q-slider :model-value="textDecorationThicknessValue"
                :min="0" :max="20" :step="0.1" label
                @update:model-value="setTextDecorationThicknessValue" />
              <div class="text-caption text-center q-mb-sm">
                {{ textDecorationThicknessValue }}{{ textDecorationThicknessUnit }}
              </div>
              <q-separator />
              <q-list dense>
                <q-item-label header>
                  {{ $t('configEditor.cssProperties.textDecorationThicknessUnit') }}
                </q-item-label>
                <q-item v-for="unit in textDecorationUnits" :key="unit"
                  clickable v-close-popup
                  :active="unit === textDecorationThicknessUnit"
                  active-class="text-primary"
                  @click="setTextDecorationThicknessUnit(unit)">
                  <q-item-section>{{ unit }}</q-item-section>
                </q-item>
              </q-list>
            </div>
          </q-menu>
        </q-btn>
        <q-btn round flat dense icon="remove_item"
          :aria-label="$t('configEditor.cssProperties.remove', { property })"
          @click="setPropertyValue(property, null)">
          <q-tooltip>{{ $t('configEditor.cssProperties.remove', { property }) }}</q-tooltip>
        </q-btn>
      </template>
    </q-input>
    <q-dialog v-model="customPropertyDialog">
      <q-card style="min-width: 20rem">
        <q-card-section class="text-h6">
          {{ $t('configEditor.cssProperties.other') }}
        </q-card-section>
        <q-card-section>
          <q-input v-model="customPropertyName" autofocus outlined dense
            :label="$t('configEditor.cssProperties.customName')"
            :error="!!customPropertyError"
            :error-message="customPropertyError"
            @keyup.enter="addCustomProperty" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat :label="$t('configEditor.buttons.cancel')"
            @click="customPropertyDialog = false" />
          <q-btn color="primary" :label="$t('configEditor.buttons.add')"
            :disable="!customPropertyName.trim()"
            @click="addCustomProperty" />
        </q-card-actions>
      </q-card>
    </q-dialog>
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
  | 'text-decoration'
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
  'text-decoration',
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
const textDecorationLineOptions = [
  { label: 'underline', value: 'underline' },
  { label: 'overline', value: 'overline' },
  { label: 'strike-through', value: 'line-through' },
]
const textDecorationStyles = ['solid', 'double', 'dotted', 'dashed', 'wavy']
const textDecorationUnits = [
  'px', 'em', 'rem', 'ex', 'ch', 'vw', 'vh', 'vmin', 'vmax',
  'cm', 'mm', 'in', 'pt', 'pc', '%',
]
type TextDecorationParts = {
  lines: string[]
  color: string
  style: string
  thickness: string
}

function parseTextDecoration(value: string): TextDecorationParts {
  const parts: TextDecorationParts = { lines: [], color: '', style: '', thickness: '' }
  for (const token of value.trim().split(/\s+/).filter(Boolean)) {
    if (textDecorationLineOptions.some(option => option.value === token)) parts.lines.push(token)
    else if (textDecorationStyles.includes(token)) parts.style = token
    else if (token === 'from-font' || /^-?(?:\d+|\d*\.\d+)(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc|%)?$/.test(token)) parts.thickness = token
    else parts.color = token
  }
  return parts
}

function serializeTextDecoration(parts: TextDecorationParts): string {
  return [...parts.lines, parts.style, parts.thickness, parts.color].filter(Boolean).join(' ')
}
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
  data() {
    return {
      customPropertyDialog: false,
      customPropertyName: '',
      customPropertyError: '',
    }
  },
  computed: {
    cssProperties(): CssProperty[] {
      return this.modelValue as CssProperty[]
    },
    selectedProperties(): string[] {
      const known = supportedProperties.filter(property => this.cssProperties.some(
        ([propertyName]) => propertyName === property,
      ))
      const custom = this.cssProperties
        .map(([propertyName]) => propertyName)
        .filter(property => !supportedProperties.includes(property as SupportedCssProperty))
      return [...known, ...custom]
    },
    availableProperties(): SupportedCssProperty[] {
      return supportedProperties.filter(property => !this.selectedProperties.includes(property))
    },
    colorProperties(): string[] {
      return colorProperties
    },
    borderProperties(): string[] {
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
    textDecorationLineOptions(): typeof textDecorationLineOptions {
      return textDecorationLineOptions
    },
    textDecorationStyles(): string[] {
      return textDecorationStyles
    },
    textDecorationLineValues(): string[] {
      return this.textDecorationParts().lines
    },
    textDecorationColor(): string {
      return this.textDecorationParts().color
    },
    textDecorationStyle(): string | null {
      return this.textDecorationParts().style || null
    },
    textDecorationThickness(): string {
      return this.textDecorationParts().thickness
    },
    textDecorationThicknessLabel(): string {
      return this.$t('configEditor.cssProperties.textDecorationThicknessButton', {
        value: this.textDecorationThickness || '—',
      })
    },
    textDecorationThicknessValue(): number {
      const match = this.textDecorationThickness.match(
        /^(-?(?:\d+|\d*\.\d+))(?:[a-z%]+)?$/,
      )
      return match ? Number(match[1]) : 1
    },
    textDecorationThicknessUnit(): string {
      const match = this.textDecorationThickness.match(
        /^-?(?:\d+|\d*\.\d+)([a-z%]+)$/,
      )
      return match?.[1] || 'px'
    },
    textDecorationUnits(): string[] {
      return textDecorationUnits
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    propertyValue(property: string): string {
      return this.cssProperties.find(([propertyName]) => propertyName === property)?.[1] || ''
    },
    borderColor(property: string): string {
      const value = this.propertyValue(property)
      return this.borderColorMatch(value)?.[0] || ''
    },
    setBorderStyle(property: string, style: string) {
      const value = this.propertyValue(property)
      const styles = borderStyles.join('|')
      const updated = new RegExp(`\\b(?:${styles})\\b`, 'i').test(value)
        ? value.replace(new RegExp(`\\b(?:${styles})\\b`, 'i'), style)
        : `${style}${value ? ` ${value}` : ''}`
      this.setPropertyValue(property, updated)
    },
    setBorderColor(property: string, color: string | number | null) {
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
    textDecorationParts(): TextDecorationParts {
      return parseTextDecoration(this.propertyValue('text-decoration'))
    },
    setTextDecorationLines(lines: string[] | null) {
      const parts = this.textDecorationParts()
      parts.lines = (lines || []).filter(line =>
        textDecorationLineOptions.some(option => option.value === line),
      )
      this.setPropertyValue('text-decoration', serializeTextDecoration(parts))
    },
    setTextDecorationColor(color: string | number | null) {
      const parts = this.textDecorationParts()
      parts.color = color ? String(color) : ''
      this.setPropertyValue('text-decoration', serializeTextDecoration(parts))
    },
    setTextDecorationStyle(style: string | null) {
      const parts = this.textDecorationParts()
      parts.style = style && textDecorationStyles.includes(style) ? style : ''
      this.setPropertyValue('text-decoration', serializeTextDecoration(parts))
    },
    setTextDecorationThicknessValue(value: number | null) {
      const parts = this.textDecorationParts()
      parts.thickness = `${value ?? 0}${this.textDecorationThicknessUnit}`
      this.setPropertyValue('text-decoration', serializeTextDecoration(parts))
    },
    setTextDecorationThicknessUnit(unit: string) {
      if (!textDecorationUnits.includes(unit)) return
      const parts = this.textDecorationParts()
      parts.thickness = `${this.textDecorationThicknessValue}${unit}`
      this.setPropertyValue('text-decoration', serializeTextDecoration(parts))
    },
    setPropertyValue(property: string, value: string | number | null) {
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
    openCustomPropertyDialog() {
      this.customPropertyName = ''
      this.customPropertyError = ''
      this.customPropertyDialog = true
    },
    addCustomProperty() {
      const property = this.customPropertyName.trim()
      if (!property) return
      if (this.cssProperties.some(([name]) => name === property)) {
        this.customPropertyError = this.$t('configEditor.cssProperties.duplicateName')
        return
      }
      this.$emit('update:modelValue', [...this.cssProperties, [property, '']])
      this.customPropertyDialog = false
    },
  },
}
</script>

<style scoped>
.css-color-button {
  border: 1px solid var(--q-separator-color);
}

.css-decoration-select {
  min-width: 8rem;
}

.css-decoration-thickness {
  width: 7rem;
}

.css-specimen {
  min-height: 2.5rem;
  padding: 0.5rem;
  border: 1px dashed var(--q-separator-color);
}
</style>

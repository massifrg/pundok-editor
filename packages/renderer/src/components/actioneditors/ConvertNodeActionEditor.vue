<template>
  <div class="row items-center q-gutter-sm">
    <q-btn-dropdown :label="labelFor(nodeType)" :title="$t('actions.editors.convertNode')" no-caps>
      <q-list>
        <q-item v-for="value in convertibleBlocks" :key="value" dense clickable v-close-popup
          @click="setNodeType(value)">
          <q-item-section>
            <q-item-label>{{ labelFor(value) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn-dropdown v-if="nodeType === NODE_NAME_HEADING" :label="String(headingLevel)"
      :title="$t('actions.editors.headingLevel')" no-caps>
      <q-list>
        <q-item v-for="level in headingLevels" :key="level" dense clickable v-close-popup
          @click="setHeadingLevel(level)">
          <q-item-section>
            <q-item-label>{{ level }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn-dropdown v-if="nodeType === NODE_NAME_PARAGRAPH" :label="paragraphStyle || $t('actions.editors.customStyle')"
      :title="$t('actions.editors.customStyle')" no-caps>
      <q-list>
        <q-item dense clickable v-close-popup @click="setParagraphStyle()">
          <q-item-section>
            <q-item-label>{{ $t('actions.editors.noCustomStyle') }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-for="style in paragraphStyles" :key="style.name" dense clickable v-close-popup
          @click="setParagraphStyle(style.name)">
          <q-item-section>
            <q-item-label>{{ style.name }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
    <q-btn-dropdown v-if="nodeType === NODE_NAME_RAW_BLOCK" :label="rawFormat || $t('actions.editors.rawFormat')"
      :title="$t('actions.editors.rawFormat')" no-caps>
      <q-list>
        <q-item v-for="format in definedRawFormats" :key="format" dense clickable v-close-popup
          @click="setRawFormat(format)">
          <q-item-section>
            <q-item-label>{{ format }}</q-item-label>
          </q-item-section>
        </q-item>
        <q-separator v-if="definedRawFormats.length && restRawFormats.length" />
        <q-item v-for="format in restRawFormats" :key="format" dense clickable v-close-popup
          @click="setRawFormat(format)">
          <q-item-section>
            <q-item-label>{{ format }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </div>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from '../helpers';

setupQuasarIcons()
</script>

<script lang="ts">
import {
  allRawFormats,
  ConvertNodeActionProps,
  CustomStyleDef,
  NODE_NAME_HEADING,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_RAW_BLOCK,
} from '../../common';
import { CONVERTIBLE_BLOCKS } from '../../schema/helpers/nodeTemplates';
import { nodeOrMarkToPandocName } from '../../schema/helpers/PandocVsProsemirror';
import { getEditorConfiguration, Heading } from '../../schema';

export default {
  props: ['index', 'action', 'editor'],
  emits: ['set-props'],
  data() {
    const props = this.action?.props as ConvertNodeActionProps | undefined
    return {
      convertibleBlocks: CONVERTIBLE_BLOCKS,
      headingLevels: Heading.options.levels,
      headingLevel: props?.attrs?.level || Heading.options.levels[0],
      paragraphStyle: props?.attrs?.customStyle || '',
      rawFormat: props?.attrs?.format || '',
    }
  },
  computed: {
    nodeType() {
      return (this.action?.props as ConvertNodeActionProps)?.nodeType || this.convertibleBlocks[0]
    },
    configuration() {
      return getEditorConfiguration(this.editor?.state)
    },
    paragraphStyles(): CustomStyleDef[] {
      return (this.configuration?.customStyles || [])
        .filter(style => style.appliesTo.includes(NODE_NAME_PARAGRAPH))
    },
    definedRawFormats(): string[] {
      return [...new Set([
        ...(this.configuration?.rawInlines || []).map(raw => raw.format),
        ...(this.configuration?.rawBlocks || []).map(raw => raw.format),
      ])].sort((a, b) => a.localeCompare(b))
    },
    restRawFormats(): string[] {
      const defined = new Set(this.definedRawFormats)
      return allRawFormats()
        .filter(format => !defined.has(format))
        .sort((a, b) => a.localeCompare(b))
    }
  },
  setup() {
    return { NODE_NAME_HEADING, NODE_NAME_PARAGRAPH, NODE_NAME_RAW_BLOCK }
  },
  methods: {
    nodeOrMarkToPandocName,
    labelFor(nodeType: string) {
      return nodeOrMarkToPandocName(
        nodeType,
        undefined,
        this.configuration,
        nodeType === NODE_NAME_HEADING
          ? { level: this.headingLevel }
          : nodeType === NODE_NAME_PARAGRAPH && this.paragraphStyle
            ? { customStyle: this.paragraphStyle }
            : nodeType === NODE_NAME_RAW_BLOCK && this.rawFormat
              ? { format: this.rawFormat }
            : undefined,
      )
    },
    setNodeType(nodeType: string) {
      const props: ConvertNodeActionProps = nodeType === NODE_NAME_HEADING
        ? { nodeType, attrs: { level: this.headingLevel } }
        : nodeType === NODE_NAME_PARAGRAPH && this.paragraphStyle
          ? { nodeType, attrs: { customStyle: this.paragraphStyle } }
        : nodeType === NODE_NAME_RAW_BLOCK && this.rawFormat
        ? { nodeType, attrs: { format: this.rawFormat } }
        : { nodeType }
      this.$emit('set-props', this.index, props)
    },
    setHeadingLevel(level: number) {
      this.headingLevel = level
      this.$emit('set-props', this.index, {
        nodeType: this.nodeType,
        attrs: { level },
      } as ConvertNodeActionProps)
    },
    setParagraphStyle(customStyle?: string) {
      this.paragraphStyle = customStyle || ''
      this.$emit('set-props', this.index, customStyle
        ? { nodeType: this.nodeType, attrs: { customStyle } }
        : { nodeType: this.nodeType })
    },
    setRawFormat(format: string) {
      this.rawFormat = format
      this.$emit('set-props', this.index, {
        nodeType: this.nodeType,
        attrs: { format },
      } as ConvertNodeActionProps)
    },
  },
}
</script>

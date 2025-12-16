<template>
  <q-btn-dropdown :label="labelFor(markTypeName)" :icon="iconFor(markTypeName)" no-caps>
    <q-list>
      <q-item v-for="([label, props]) in options" dense clickable v-close-popup @click="setMarkType(props.markType)">
        <q-item-section side><q-icon :name="iconFor(props.markType)" /></q-item-section>
        <q-item-section><q-item-label>{{ label }}</q-item-label></q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script lang="ts">
import {
  AddOrRemoveMarkActionProps,
  MARK_NAME_CITE,
  MARK_NAME_CODE,
  MARK_NAME_DOUBLE_QUOTED,
  MARK_NAME_EMPH,
  MARK_NAME_LINK,
  MARK_NAME_MATH,
  MARK_NAME_SINGLE_QUOTED,
  MARK_NAME_SMALLCAPS,
  MARK_NAME_STRIKEOUT,
  MARK_NAME_STRONG,
  MARK_NAME_SUBSCRIPT,
  MARK_NAME_SUPERSCRIPT,
  MARK_NAME_UNDERLINE
} from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { iconFor } from '../../schema';

export default {
  props: ['index', 'action'],
  emits: ['set-props'],
  data() {
    return {
      options: [
        ['Emph', { markType: MARK_NAME_EMPH }],
        ['Strong', { markType: MARK_NAME_STRONG }],
        ['Underline', { markType: MARK_NAME_UNDERLINE }],
        ['Strikeout', { markType: MARK_NAME_STRIKEOUT }],
        ['Superscript', { markType: MARK_NAME_SUPERSCRIPT }],
        ['Subscript', { markType: MARK_NAME_SUBSCRIPT }],
        ['SmallCaps', { markType: MARK_NAME_SMALLCAPS }],
        ['Quoted(SingleQuoted)', { markType: MARK_NAME_SINGLE_QUOTED }],
        ['Quoted(DoubleQuoted)', { markType: MARK_NAME_DOUBLE_QUOTED }],
        ['Math(InlineMath)', { markType: MARK_NAME_MATH, attrs: { mathType: 'InlineMath' } }],
        ['Math(DisplayMath)', { markType: MARK_NAME_MATH, attrs: { mathType: 'DisplayMath' } }],
        ['Link', { markType: MARK_NAME_LINK }],
        ['Cite', { markType: MARK_NAME_CITE }],
        ['Code', { markType: MARK_NAME_CODE }],
      ] as [label: string, props: AddOrRemoveMarkActionProps][]
    }
  },
  computed: {
    markTypeName() {
      return (this.action?.props as AddOrRemoveMarkActionProps)?.markType || MARK_NAME_EMPH
    }
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    labelFor(markTypeName: string) {
      const mark = this.options.find(([_, props]) => props.markType === markTypeName)
      return mark && mark[0] || ''
    },
    iconFor(markTypeName: string) {
      return iconFor(markTypeName)
    },
    setMarkType(markType: string) {
      this.$emit('set-props', this.index, { markType } as AddOrRemoveMarkActionProps)
    }
  }
}
</script>
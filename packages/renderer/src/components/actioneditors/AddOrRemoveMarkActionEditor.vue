<template>
  <q-select v-model='markTypeName' @update:model-value="change">
    <q-list>
      <q-item>
        <q-item-section side><q-icon name="mdi-italic" /></q-item-section>
        <q-item-section>Emph</q-item-section>
      </q-item>
      <q-item>
        <q-item-section side><q-icon name="mdi-bold" /></q-item-section>
        <q-item-section>Strong</q-item-section>
      </q-item>
    </q-list>
  </q-select>
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

export default {
  props: ['index'],
  emits: ['set-props'],
  data() {
    return {
      options: {
        Emph: { markType: MARK_NAME_EMPH },
        Strong: { markType: MARK_NAME_STRONG },
        Underline: { markType: MARK_NAME_UNDERLINE },
        Strikeout: { markType: MARK_NAME_STRIKEOUT },
        Superscript: { markType: MARK_NAME_SUPERSCRIPT },
        Subscript: { markType: MARK_NAME_SUBSCRIPT },
        SmallCaps: { markType: MARK_NAME_SMALLCAPS },
        'Quoted(SingleQuoted)': { markType: MARK_NAME_SINGLE_QUOTED },
        'Quoted(DoubleQuoted)': { markType: MARK_NAME_DOUBLE_QUOTED },
        'Math(InlineMath)': { markType: MARK_NAME_MATH, attrs: { mathType: 'InlineMath' } },
        'Math(DisplayMath)': { markType: MARK_NAME_MATH, attrs: { mathType: 'DisplayMath' } },
        Link: { markType: MARK_NAME_LINK },
        Cite: { markType: MARK_NAME_CITE },
        Code: { markType: MARK_NAME_CODE },
      } as Record<string, AddOrRemoveMarkActionProps>,
      markTypeName: ""
    }
  },
  methods: {
    change(value: string | number | null) {
      this.$emit('set-props', this.index, { markType: value } as AddOrRemoveMarkActionProps)
    }
  }
}
</script>
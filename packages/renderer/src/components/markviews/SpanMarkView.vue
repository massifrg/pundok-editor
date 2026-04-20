<template>
  <span :className="customStyleClass" :custom-style="customStyle" :style="customStyleProps">
    <mark-view-content />
  </span>
</template>

<script lang="ts">
import { MarkViewContent, markViewProps } from '@tiptap/vue-3'
import { getDocState } from '../../schema/helpers';
import { appliesTo, MARK_NAME_SPAN } from '../../common';

export default {
  components: {
    MarkViewContent,
  },
  props: markViewProps,
  computed: {
    configuration() {
      const docState = getDocState(this.editor?.state)
      return docState?.configuration
    },
    customStyle() {
      return this.mark.attrs?.kv['custom-style']
    },
    customStyleProps() {
      const cs = this.customStyle
      if (this.configuration) {
        const styleDef = this.configuration?.customStyles?.find((d) => d.name == cs && appliesTo(d, MARK_NAME_SPAN))
        if (styleDef) {
          if (Array.isArray(styleDef.css) && styleDef.css.length > 0) {
            return styleDef.css
              .map(([prop, value]) => `${prop}: ${value}`)
              .join('; ');
          }
        }
      }
    },
    customStyleClass() {
      return this.customStyle && this.customStyleProps
        ? 'custom-style'
        : 'unstyled-custom-style'
    },
  }
}
</script>
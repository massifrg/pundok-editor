<template>
  <q-card-actions>
    <q-btn :label="buttonLabel" size="sm" no-caps title="edit RawInline(s)">
      <q-popup-proxy>
        <q-card>
          <q-card-section>
            <q-input v-model='format' label="format" @update:model-value="setFormat" />
            <q-input v-model='content1' :label="where + ':'" @update:model-value="setContent1" />
            <q-input v-model='content2' label="after:" @update:model-value="setContent2" />
          </q-card-section>
        </q-card>
      </q-popup-proxy>
    </q-btn>
    <q-space style="min-width:0.5rem" />
    <q-btn icon="load_predefined" size="sm" color="primary" title="select predefined RawInline(s)">
      <RawInlineMenu :editor="editor" :sortable="true" @raw-inline-selected="rawInlineSelected" />
    </q-btn>
    <q-space style="min-width:0.5rem" />
    <q-btn color="primary" size="sm" :icon="whereIcon" :disabled="isPair" :title="whereTitle" @click="toggleWhere" />
  </q-card-actions>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from '../helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { DEFAULT_RAW_INLINE_FORMAT, InsertRawInlineActionProps } from '../../common';
import RawInlineMenu from '../RawInlineMenu.vue';
import { defaultPropsFor } from '../../actions';
import { getEditorConfiguration, RawInline } from '../../schema';

export default {
  props: ['editor', 'index', 'action'],
  data() {
    const config = getEditorConfiguration(this.editor)
    const props = this.action.props || defaultPropsFor('insert-raw-inline', config) as InsertRawInlineActionProps
    const content = props?.content || ''
    return {
      content1: Array.isArray(content) && content[0] || content as string,
      content2: Array.isArray(content) && content[1] || '' as string,
      format: props.format as string,
      content: props.content as string | string[],
      where: props.where || 'before' as 'before' | 'after'
    }
  },
  components: { RawInlineMenu },
  emits: ['set-props'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    isPair() {
      return this.content && Array.isArray(this.content) && this.content.length == 2
    },
    buttonLabel() {
      const content = this.content || ''
      return this.isPair ? (content as string[]).join('...') : content as string
    },
    whereIcon() {
      return this.isPair
        ? 'place_around'
        : this.where === 'after' ? 'arrow_right' : 'arrow_left'
    },
    leftRawInline(): string {
      return this.isPair ? this.content[0] || '' : this.content as string
    },
    rightRawInline(): string {
      return this.isPair ? this.content[1] || '' : ''
    },
    whereTitle() {
      const f = this.format
      const l = this.leftRawInline
      const r = this.rightRawInline
      return this.isPair
        ? `insert the RawInlines(${f}) “${l}” and “${r}” around the selected text`
        : `insert a RawInline(${f}) “${l}” ${this.where} the selected text`
    }
  },
  methods: {
    setFormat(f: string | number | null) {
      const format = f
        ? f.toString()
        : RawInline.options?.defaultFormat || this.configuration?.defaultRawFormat || DEFAULT_RAW_INLINE_FORMAT
      if (this.format !== format) {
        this.format = format
        this.emitProps()
      }
    },
    setContent1(c1: string | number | null) {
      const s = c1 ? c1.toString() : ''
      this.content1 = s
      this.content = this.content2.length > 0 ? [s, this.content2] : s
      this.emitProps()
    },
    setContent2(c2: string | number | null) {
      const s = c2 ? c2.toString() : ''
      this.content2 = s
      this.content = this.content2.length > 0 ? [this.content1, s] : this.content1
      this.emitProps()
    },
    toggleWhere() {
      const where = this.where
      if (this.isPair)
        this.where = 'before'
      else if (where === 'before')
        this.where = 'after'
      else
        this.where = 'before'
      this.emitProps()
    },
    // setWhere(where: 'before' | 'after') {
    //   if (where !== this.where) {
    //     this.where = where
    //     this.emitProps()
    //   }
    // },
    rawInlineSelected(format: string, content: string | string[] | undefined) {
      if (content) {
        if (this.where !== 'before' && Array.isArray(content) && content.length > 1)
          this.where = 'before'
        this.format = format
        this.content = content
        this.content1 = Array.isArray(content) ? content[0] || '' : content
        this.content2 = Array.isArray(content) ? content[1] || '' : ''
        this.emitProps()
      }
    },
    emitProps() {
      this.$emit('set-props', this.index, {
        format: this.format,
        where: this.where,
        content: this.content
      } as InsertRawInlineActionProps)
    }
  }
}
</script>
<template>
  <IntegerEditor attr-name="level" :min-value="1" :max-value="maxLevel" :start-value="startValue"
    @update-attribute="updateLevel" />
</template>

<script lang="ts">
import { Editor } from '@tiptap/vue-3';
import { max } from 'lodash';
import IntegerEditor from './IntegerEditor.vue';

export default {
  components: { IntegerEditor },
  props: {
    editor: Editor,
    startValue: Number,
  },
  emits: ['update-attribute'],
  computed: {
    maxLevel(): number {
      const extension = this.editor && this.editor.extensionManager.extensions.find(e => e.name === 'heading');
      return max(extension?.options.levels) || 6;
    },
    levels() {
      const ll = [];
      for (let l = 1; l <= this.maxLevel; l++) {
        ll.push(l);
      }
      return ll;
    },
  },
  methods: {
    updateLevel(_attrName: string, newValue: number) {
      this.$emit('update-attribute', 'level', newValue);
    },
  },
};
</script>
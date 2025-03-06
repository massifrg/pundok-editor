<template>
  <q-card class="q-my-xs">
    <q-card-section class="q-mx-sm" horizontal>
      <q-input class="q-mx-xs" :model-value="idValue" label="id" stack-label @update:model-value="setIdValue"
        style="min-width: 40%" />
    </q-card-section>
    <q-card-section>
      <IndexIdEditor :editor="editor" :index-name="indexName" :start-value="startValue"
        :starting-search-text="startingSearchText" :sources="sources" :search-every-word="searchEveryWord"
        :starting-search-text-variant="startingSearchTextVariant" @selected="setIdValue" @commit="$emit('commit')"
        @change-search-text-variant="setVariant" />
    </q-card-section>
  </q-card>
</template>

<script lang="ts">
import IndexIdEditor, { SearchTextVariant } from './IndexIdEditor.vue';

export default {
  components: { IndexIdEditor },
  props: [
    'editor',
    'nodeOrMark',
    'startValue',
    'indexName',
    'startingSearchText',
    'sources',
    'searchEveryWord',
    'startingSearchTextVariant'
  ],
  emits: ['update-attribute', 'commit', 'change-search-text-variant'],
  data() {
    return {
      searchTerm: '',
      idValue: this.startValue,
    };
  },
  computed: {
  },
  watch: {
    startValue(value) {
      this.idValue = value
    },
  },
  methods: {
    emitUpdate(attrName: string, value?: string) {
      this.$emit('update-attribute', 'id', value || this.idValue)
    },
    setIdValue(id: string | number | null) {
      const idValue = id ? id.toString() : ''
      if (idValue !== this.idValue) {
        this.idValue = idValue
        this.emitUpdate('id', this.idValue)
      }
    },
    setVariant(variant: SearchTextVariant) {
      this.$emit('change-search-text-variant', variant)
    },
  },
};
</script>

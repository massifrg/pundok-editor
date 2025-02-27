<template>
  <q-input class="q-mx-xs" v-model="targetUrl" :autofocus="!isImage" label="URL" stack-label debounce="500"
    @update:model-value="updateTargetUrl">
    <template v-slot:append>
      <q-icon v-if="isImage" name="mdi-file-image" @click="askTargetFileUrl" />
    </template>
  </q-input>
  <q-input class="q-mx-xs" v-model="targetTitle" :autofocus="isImage" label="title" stack-label debounce="500"
    @update:model-value="updateTargetTitle" />
</template>

<script lang="ts">
import { useBackend } from '../../stores';
import { mapState } from 'pinia';
import { getDocState, makePathRelativeToDoc } from '../../schema';

export default {
  props: ['editor', 'urlAttrName', 'url', 'title'],
  emits: ['update-attribute'],
  data() {
    return {
      targetUrl: this.url || '',
      targetTitle: this.title || '',
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    isImage() {
      return this.urlAttrName === 'src'
    }
  },
  watch: {
    url(value: string | null) {
      this.updateTargetUrl(value)
    },
    title(value: string | null) {
      this.updateTargetTitle(value)
    }
  },
  methods: {
    updateTargetUrl(value: string | number | null) {
      this.targetUrl = value
      this.$emit('update-attribute', this.urlAttrName || 'url', this.targetUrl)
    },
    updateTargetTitle(value: string | number | null) {
      this.targetTitle = value
      this.$emit('update-attribute', 'title', this.targetTitle)
    },
    async askTargetFileUrl() {
      const docState = getDocState(this.editor.state)
      // console.log(docState)
      const coords = await this.backend?.askForDocumentIdOrPath('image', {
        editorKey: docState?.editorKey,
        project: docState?.project,
        openDialogOptions: {
          filters: [
            {
              name: "raster images",
              extensions: ["jpg", "jpeg", "png"],
            },
            {
              name: "vector images",
              extensions: ["svg", "pdf"]
            }
          ]
        }
      })
      if (coords) {
        // console.log(coords)
        const { src } = coords
        if (src) {
          this.updateTargetUrl(docState ? makePathRelativeToDoc(docState, src) : src)
        }
      }
    }
  }
}
</script>
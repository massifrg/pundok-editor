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
import { mapState } from 'pinia';
import { DEFAULT_START_FOLDER, DocumentFormat, imageFormatFromFilename } from '../../common';
import { showSelectImageDialog } from '../helpers';
import { getEditorDocState, makePathRelativeToDoc } from '../../schema';
import { useBackend } from '../../stores';

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
      const docState = getEditorDocState(this.editor)
      const { project, inputFolder, outputFolder } = docState || {}
      let url: URL
      let path = this.targetUrl
      console.log(path)
      try {
        url = new URL(path)
      } catch (err) {
        path = outputFolder || inputFolder || project?.path
        path = path ? path + '/' + this.targetUrl : this.targetUrl
        console.log(path)
      } finally {
        url = new URL('file://' + path)
      }
      const chunks = url && url.pathname.split('/')
      const filename = url && chunks.pop()
      const startFolder = url && chunks.join('/')
        || docState?.imagesFolder || docState?.inputFolder || DEFAULT_START_FOLDER
      const format = filename && imageFormatFromFilename(filename) || undefined
      const startFormat = format
        ? { ...format, ftype: 'image' } as DocumentFormat
        : docState?.imagesFormat
      showSelectImageDialog({
        editor: this.editor,
        prompt: 'Choose an image:',
        startFolder,
        startFormat,
        callback: (context) => {
          const { path, documentFormat } = context
          this.editor.commands.updateDocState({
            // TODO: update also imagesFolder
            imagesFormat: documentFormat || docState?.imagesFormat,
          })
          if (path)
            this.updateTargetUrl(docState ? makePathRelativeToDoc(docState, path) : path)
        }
      })
    }
  }
}
</script>
<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { mapState } from 'pinia';
import {
  ACTION_DOCUMENT_OPEN,
  setActionCommand
} from '../actions';
import { bookmarkLabel, DocumentBookmark, DocumentOpenActionProps, ProjectBookmark, PundokBookmark } from '../common';
import { editorKeyFromState, getDocState } from '../schema';
import { useBackend } from '../stores';

export default {
  props: ['editor'],
  data() {
    return {
      docBookmarks: [] as DocumentBookmark[],
      projectBookmarks: [] as ProjectBookmark[],
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    editorKey() {
      return editorKeyFromState(this.editor?.state)
    },
  },
  methods: {
    docState() {
      return getDocState(this.editor)
    },
    async loadBookmarks() {
      this.docBookmarks = (await this.backend?.getBookmarks('document') || []) as DocumentBookmark[]
      this.projectBookmarks = (await this.backend?.getBookmarks('project') || []) as ProjectBookmark[]
    },
    titleForBookmark(b: PundokBookmark) {
      const { label, tooltip } = bookmarkLabel(b)
      return `${label}, ${tooltip}`
    },
    labelForBookmark(b: PundokBookmark) {
      const { label } = bookmarkLabel(b)
      return label
    },
    openDocument() {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {})
    },
    openProjectBookmark(p: ProjectBookmark) {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {
          context: {
            path: p.url
          }
        } as DocumentOpenActionProps)
    },
    openDocBookmark(d: DocumentBookmark) {
      if (this.editorKey)
        setActionCommand(this.editorKey, ACTION_DOCUMENT_OPEN, {
          context: {
            path: d.url,
            configurationName: d.configurationName
          }
        } as DocumentOpenActionProps)
    },
  }
}
</script>

<template>
  <q-btn-dropdown class="toolbar-button" title="open document" split dense icon="document_open"
    dropdown-icon="menu_down" @click="openDocument()" @before-show="loadBookmarks()" elevation="3" size="sm"
    color="grey-5">
    <q-list dense>
      <q-item :disable="projectBookmarks.length === 0" key="recent-projects" title="open recent project" clickable>
        <q-item-section>
          <q-item-label>recent projects</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="menu_right" />
        </q-item-section>
        <q-menu anchor="top right" self="top left">
          <q-list>
            <q-item v-for="p in projectBookmarks" :key="p.url" :title="titleForBookmark(p)" clickable v-close-popup
              @click="openProjectBookmark(p)">
              <q-item-section>
                {{ p.name }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
      <q-item :disable="docBookmarks.length === 0" key="recent-documents" title="open recent document" clickable>
        <q-item-section>
          <q-item-label>recent documents</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon name="menu_right" />
        </q-item-section>
        <q-menu anchor="top right" self="top left">
          <q-list>
            <q-item v-for="d in docBookmarks" :key="d.url" :title="titleForBookmark(d)" clickable v-close-popup
              @click="openDocBookmark(d)">
              <q-item-section>
                {{ labelForBookmark(d) }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>
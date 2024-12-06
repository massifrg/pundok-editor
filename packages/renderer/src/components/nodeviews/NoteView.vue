<template>
  <node-view-wrapper class="inline-wrapper">
    <span style="position: relative; top: -.8rem" draggable="true" contenteditable="false">
      <q-btn padding="0px 2px" :class="`notetype-${noteType}`" :label="markerText" data-drag-handle size="md" dense
        fab-mini no-caps :style="{ color, backgroundColor }" @click="toggleShowMode()" />
    </span>
    <!-- <span v-if="showId" contenteditable="false" class="note-id">{{ idValue }}</span> -->
    <q-card :contenteditable="isOpen" :class="contentClasses"
      :style="{ display: displayContent, color, backgroundColor }">
      <q-card-actions>
        <q-badge :label="idValue" />
        <q-space />
        <q-btn icon="mdi-delete" title="delete note" size="sm" @click="deleteNode" />
        <q-space style="max-width: 3rem" />
        <q-btn icon="mdi-refresh" title="refresh/fix note numbers" size="sm" @click="refreshNotes()" />
        <q-space style="max-width: 3rem" />
        <q-btn icon="mdi-close" title="close note" size="sm" @click="hide()" />
        <q-btn icon="mdi-close-box-multiple-outline" :title="'close every ' + noteType" size="sm"
          @click="hideAllOfTheSameType()" />
        <q-btn icon="mdi-close-box-multiple" title="close every note of ANY type" size="sm" @click="hideAllNotes()" />
      </q-card-actions>
      <q-card-section>
        <node-view-content as="div" class="note-text"
          :style="{ display: displayContent, color, backgroundColor, border: `1px solid ${color || 'black'}` }" />
      </q-card-section>
    </q-card>
  </node-view-wrapper>
</template>

<script lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps, Editor } from '@tiptap/vue-3';
import { CachedNote } from '../../schema/nodes/Note';
import { isArray } from 'lodash';
import { romanize } from 'romanize-deromanize'
import {
  DEFAULT_NOTE_TYPE,
  DEFAULT_NOTE_TEXT_COLOR,
  DEFAULT_NOTE_BACKGROUND_COLOR
} from '../../common';
import { getEditorConfiguration, getEditorDocState } from '../../schema';
import { mapState } from 'pinia'
import { useActions, useNotes } from '../../stores';
import { NotesViewAction, ViewAction, setViewActionCloseNotes } from '/@/actions';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { ResolvedPos } from '@tiptap/pm/model';

const MarkerConversions: Record<string, (n: number) => string> = {
  'noConversion': n => n.toString(),
  'lower-alpha': n => String.fromCodePoint((n - 1) % 26 + 97),
  'upper-alpha': n => String.fromCodePoint((n - 1) % 26 + 65),
  'lower-roman': n => romanize(n <= 0 ? 1 : n).toLowerCase(),
  'upper-roman': n => romanize(n <= 0 ? 1 : n),
  'lower-greek': n => String.fromCodePoint((n - 1) % 25 + 0x3b1),
  'upper-greek': n => String.fromCodePoint((n - 1) % 25 + 0x391),
}

export default {
  components: {
    NodeViewWrapper,
    NodeViewContent,
  },

  props: nodeViewProps,

  data() {
    return {
      noteNumber: 0,
      /** The state of the note, toggled by user or by selection entering it (e.g. in search/replace) */
      isOpen: true,
      /** The state before selection entered and forced the note to open. */
      wasOpenBeforeSelection: true,
    }
  },

  computed: {
    ...mapState(useNotes, ['tick']),
    ...mapState(useActions, ['lastViewAction']),
    isInSelection() {
      const { from, to } = this.editor.state.selection
      const start = this.getPos() + 1
      const end = start + this.node.content.size
      return (from >= start && from <= end) || (to >= start && to <= end)
    },
    isSelected() {
      const selection = this.editor.state.selection
      return selection
        && selection instanceof NodeSelection
        && (selection as NodeSelection).from === this.getPos()
    },
    configuration() {
      return getEditorConfiguration(this.editor as Editor)
    },
    editorKey() {
      const editorKey = getEditorDocState(this.editor as Editor)?.editorKey
      return editorKey
    },
    noteStyles() {
      return this.configuration?.noteStyles || []
    },
    noteType() {
      return this.node.attrs.noteType || DEFAULT_NOTE_TYPE
    },
    noteStyle() {
      return this.noteStyles.find(ns => ns.noteType === this.noteType)
    },
    markerText() {
      const n = this.noteNumber
      const noteStyle = this.noteStyle
      const conv = noteStyle?.markerConversion
      let marker = n.toString()
      if (conv) {
        if (isArray(conv) && conv.length > 0) {
          marker = conv[(n - 1) % conv.length]
        } else {
          const conversion = conv && MarkerConversions[conv as string] || MarkerConversions.noConversion
          console.log(`${conv}: ${n} => ${conversion(n)}`)
          marker = conversion(n)
        }
      }
      const before = noteStyle?.markerBefore || ''
      const after = noteStyle?.markerAfter || ''
      return `${before}${marker}${after}`
    },
    noteTextColor() {
      return this.noteStyle?.textColor || DEFAULT_NOTE_TEXT_COLOR
    },
    noteBackgroundColor() {
      return this.noteStyle?.backgroundColor || DEFAULT_NOTE_BACKGROUND_COLOR
    },
    color() {
      return this.isSelected ? this.noteBackgroundColor : this.noteTextColor
    },
    backgroundColor() {
      return this.isSelected ? this.noteTextColor : this.noteBackgroundColor
    },
    contentClasses() {
      const classes = ['note-content', 'visible-note-content', `notetype-${this.noteType}`];
      return classes;
    },
    displayContent() {
      return this.isOpen ? 'block' : 'none';
    },
    showId() {
      return true;
    },
    idValue() {
      const id = this.node.attrs.id;
      if (id) return `[id=${id}]`;
      return '[no id]';
    },
  },

  mounted() {
    this.updateNoteNumber()
  },

  methods: {
    findFirstTextOffset() {
      const noteNode = this.node
      const size = noteNode.content.size
      let offset;
      for (offset = 1; offset < size; offset++) {
        const n = noteNode.nodeAt(offset)
        console.log(n)
        if (n && n.isText) break
      }
      return offset === size ? 1 : offset
    },
    firstTextResolvedPos(): ResolvedPos | undefined {
      const doc = this.editor?.state?.doc
      return doc ? doc.resolve(this.getPos() + 1 + this.findFirstTextOffset()) : undefined
    },
    toggleShowMode(isUserWill: boolean = true) {
      this.isOpen = !this.isOpen
      // wasOpenBeforeSelection follows isOpen when it's the user opening/closing a note
      if (isUserWill) {
        this.wasOpenBeforeSelection = this.isOpen
        if (this.isOpen) {
          const $pos = this.firstTextResolvedPos()
          if ($pos) this.editor.chain()
            .setTextSelection(new TextSelection($pos))
            .focus()
            .run()
        }
      }
    },
    hide(isUserWill: boolean = true) {
      this.isOpen = false
      // wasOpenBeforeSelection follows isOpen when it's the user opening/closing a note
      if (isUserWill) this.wasOpenBeforeSelection = this.isOpen
    },
    updateNoteNumber() {
      const storage = this.extension.storage
      if (storage) {
        const pos = this.getPos()
        const note = (storage.notes as CachedNote[]).find(n => n.pos === pos)
        if (note) this.noteNumber = note.noteNumber
      }
    },
    refreshNotes() {
      this.editor?.commands.refreshNotes()
    },
    hideAllOfTheSameType() {
      if (this.editorKey) {
        setViewActionCloseNotes(this.editorKey, this.noteType)
        this.refreshNotes()
      }
    },
    hideAllNotes() {
      if (this.editorKey) {
        setViewActionCloseNotes(this.editorKey)
        this.refreshNotes()
      }
    }
  },

  watch: {
    tick(newValue, oldValue) {
      if (newValue !== oldValue) this.updateNoteNumber()
    },
    lastViewAction(va: ViewAction) {
      const { command, editorKey, noteType } = va as NotesViewAction
      if (editorKey === this.editorKey && (!noteType || noteType === this.noteType)) {
        this.isOpen = command === 'open'
      }
    },
    isInSelection(isInSel, wasInSel) {
      if (isInSel && !wasInSel) {
        this.wasOpenBeforeSelection = this.isOpen
        this.isOpen = true
      } else {
        this.isOpen = this.wasOpenBeforeSelection
      }
    },
  },
};
</script>

<style lang="scss">
.inline-wrapper {
  display: inline;
}

.note-id {
  font-family: monospace;
  font-size: smaller;
  color: #999999;
}

div.note-content {
  display: none;

  &.visible-note-content {
    display: block;
    width: 80%;
    border: 4pt solid lightgray;
    // background-color: rgb(255, 223, 173);
    border-radius: 1rem;
    padding: 0.2rem;
  }
}

div.note-content div.note-text {
  font-size: 16pt;
  font-style: normal;
  font-weight: normal;
}
</style>

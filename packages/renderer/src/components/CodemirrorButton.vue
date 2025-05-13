<template>
  <ToolbarButton icon="mdi-language-markdown" @click="editorVisible = true">
    <q-dialog v-model="editorVisible" full-width full-height no-esc-dismiss>
      <q-card>
        <q-card-section>
          <codemirror
            v-model="content"
            placeholder="Code goes here..."
            :autofocus="true"
            :indent-with-tab="true"
            :tab-size="2"
            :extensions="extensions"
            :style="{ height: editorHeight }"
            @ready="handleReady"
            @change="log('change', $event)"
            @focus="log('focus', $event)"
            @blur="log('blur', $event)"
          />
        </q-card-section>
        <q-card-actions>
          <q-space />
          <q-btn label="ok" @click="commitThenClose()" />
          <q-btn label="cancel" @click="editorVisible = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </ToolbarButton>
</template>

<script lang="ts">
import { defineComponent, ref, shallowRef, toRaw } from 'vue';
import { Codemirror } from 'vue-codemirror';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import ToolbarButton from './ToolbarButton.vue';
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import { getDocAsJsonString, getDocState } from '../schema/helpers';
import {
  ACTION_BACKEND_FEEDBACK,
  ACTION_SET_CONTENT,
  setActionCommand,
} from '../actions';

export default defineComponent({
  props: ['editor'],
  components: {
    Codemirror,
    ToolbarButton,
  },
  setup() {
    const editorVisible = ref(false);
    const content = ref(`markdown code`);
    const extensions = [markdown(), oneDark, EditorView.lineWrapping];

    // Codemirror EditorView instance ref
    const view = shallowRef();
    const handleReady = (payload) => {
      view.value = payload.view;
    };

    // Status is available at all times via Codemirror EditorView
    const getCodemirrorStates = () => {
      const state = view.value.state;
      const ranges = state.selection.ranges;
      const selected = ranges.reduce(
        (r, range) => r + range.to - range.from,
        0,
      );
      const cursor = ranges[0].anchor;
      const length = state.doc.length;
      const lines = state.doc.lines;
      // more state info ...
      // return ...
    };

    return {
      editorVisible,
      editorHeight: ref('85vh'),
      content,
      extensions,
      handleReady,
      log: () => {},
      // log: console.log,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
  },
  watch: {
    async editorVisible(newValue) {
      const state = this.editor.state;
      if (newValue && state) {
        const docState = getDocState(state);
        const json = getDocAsJsonString(state);
        // console.log(json);
        try {
          const transformed = await this.backend?.transformPandocJson(
            json,
            {
              type: 'pandoc-filter',
              fromFormat: 'json',
              toFormat: 'markdown',
              pandocOptions: ['--wrap=none', '-s'],
            },
            {
              project: docState?.project,
              configurationName: docState?.configuration?.name,
            },
          );
          this.content = transformed;
        } catch (err) {
          console.log(err);
          const feedback: FeedbackMessage = {
            type: 'error',
            message: err.toString(),
          };
          setActionCommand(state, ACTION_BACKEND_FEEDBACK, { feedback });
          this.editorVisible = false;
        }
      }
    },
  },
  methods: {
    async commitThenClose() {
      const state = this.editor.state;
      if (state) {
        const docState = getDocState(state);
        const content = await this.backend?.transformPandocJson(
          toRaw(this.content),
          {
            type: 'pandoc-filter',
            fromFormat: 'markdown',
            toFormat: 'json',
            pandocOptions: ['-s'],
          },
          {
            project: docState?.project,
            configurationName: docState?.configuration?.name,
          },
        );
        // console.log(content);
        setActionCommand(state, ACTION_SET_CONTENT, { content });
        this.editorVisible = false;
      }
    },
  },
});
</script>

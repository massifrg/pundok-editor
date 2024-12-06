<template>
  <q-bar class="q-py-lg" tag="p" style="text-indent: 0">
    <div v-for="crumb in labeledNodesAndMarks" :key="crumb.key" style="margin: 0; margin-right: 2px">
      <q-btn :color="colorFor(crumb)" elevation="3" size="md" no-caps :class="`pandoc-label label-${crumb.class}`"
        @click="showCrumbMenu = crumb" @mouseenter="crumbEntered(crumb)">
        {{ crumb.label }}
      </q-btn>
      <q-tooltip v-if="showTooltips && tooltipFor(crumb)" class="bg-amber-2 text-black text-body2" anchor="bottom end"
        v-html="tooltipFor(crumb)" max-width="50vw" style="opacity: 0.8; min-width: 20vw" @show="highlight(crumb)"
        @hide="highlightNothing()">
      </q-tooltip>
      <q-menu :model-value="showCrumbMenu === crumb" @show="showTooltips = false" @hide="showTooltips = true">
        <NodeOrMarkContextMenu :editor="editor" :node-or-mark="crumb" />
      </q-menu>
    </div>
  </q-bar>
</template>

<script lang="ts">
import type { MarkRange, NodeWithPos } from '@tiptap/core';
import { CustomStyleDef } from '../common';
import { type LabeledNodeOrMark, labeledNodesAndMarks, getMarkRangesBetween, colorFor, tooltipFor } from '../schema/helpers';
import NodeOrMarkContextMenu from './NodeOrMarkContextMenu.vue';
import { getEditorConfiguration } from '../schema';

const BREADCRUMB_TOOLTIP_CLASS = 'bc-tooltip';

export default {
  components: { NodeOrMarkContextMenu },
  props: ['editor', 'currentNodesWithPos'],
  data() {
    return {
      maxItemsToShow: 13,
      hoverCrumb: undefined as LabeledNodeOrMark | undefined,
      showCrumbMenu: undefined as LabeledNodeOrMark | undefined,
      showTooltips: true
    };
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyleDefs(): CustomStyleDef[] {
      return this.configuration?.customStyles || []
    },
    nameToCustomStyle(): Record<string, CustomStyleDef> {
      return Object.fromEntries(this.customStyleDefs.map(cs => ([cs.name, cs])))
    },
    doc() {
      return this.editor?.state?.doc
    },
    currentTextMarks(): MarkRange[] {
      const { from, to } = this.editor.state.selection;
      return getMarkRangesBetween(from, to, this.editor.state.doc);
    },
    labeledNodesAndMarks(): LabeledNodeOrMark[] {
      return labeledNodesAndMarks(
        this.currentNodesWithPos as NodeWithPos[],
        this.currentTextMarks,
        {
          limit: this.maxItemsToShow,
          nameToCustomStyle: this.nameToCustomStyle
        })
    },
  },
  methods: {
    highlight(crumb: LabeledNodeOrMark) {
      this.editor.chain().highlightSection(crumb).run()
    },
    highlightNothing() {
      this.editor.chain().highlightNothing().run()
    },
    crumbEntered(crumb: LabeledNodeOrMark) {
      // console.log(`entered crumb ${crumb.name}`)
      if (crumb !== this.showCrumbMenu) {
        this.showCrumbMenu = undefined
      }
    },
    colorFor(labeled: LabeledNodeOrMark) {
      return colorFor(labeled)
    },
    tooltipFor(labeled: LabeledNodeOrMark) {
      return tooltipFor(labeled, this.doc, [BREADCRUMB_TOOLTIP_CLASS])
    }
  },
};
</script>

<style>
.pandoc-label {
  background: #777;
  color: white;
  text-transform: none;
  margin-left: 3px;
}

.label-Block {
  background: #77e;
}

.label-Inline {
  background: #d94;
}

.highlighted {
  background-color: grey;
  opacity: 0.5;
  /* border-bottom: 6px dotted red; */
}

div.highlighted {
  background-color: grey;
  opacity: 0.5;
  margin: 0;
  padding: 0;
}

/* TOOLTIPS */
span.tt-node-name {
  font-weight: bold;
}

span.tt-mark-name {
  font-weight: bold;
}

span.tt-marked-text::before,
span.tt-marked-text::after {
  content: '"'
}

span.tt-attr-name {
  font-style: italic;
  color: blue;
}

/* span.tt-attr-value::before, */
/* span.tt-attr-value::after, */
span.tt-kv-value::before,
span.tt-kv-value::after {
  content: '"'
}

span.tt-kv-name {
  font-style: italic;
  color: rgb(137, 0, 0);
  line-height: 80%;
}

span.tt-kv-value {
  line-height: 80%;
}
</style>

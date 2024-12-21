<template>
  <PundokEditor class="pundok-editor" ref="editor" v-model="content" main-editor :gui-props="guiProps" />
</template>

<script lang="ts">
// import './index.css'
import { defineComponent } from 'vue';
import { useQuasar } from 'quasar'
import { mapState } from 'pinia';
import { useBackend } from './stores';
import { createBackend } from './backend/backend';
import PundokEditor from './components/PundokEditor.vue';
import testingContent from './assets/test-pandoc.json?raw';
import { EditorGUIPropsClass } from './components/EditorGUIProps';

const electronIpc = window && window.ipc;

export default defineComponent({
  name: 'PandocApp',
  components: {
    PundokEditor,
  },
  setup() {
    const backendStore = useBackend();
    backendStore.setBackend(createBackend({ ipc: electronIpc }));
  },
  data() {
    return {
      $q: useQuasar(),
      content: testingContent,
      guiProps: new EditorGUIPropsClass()
    }
  },
  computed: {
    ...mapState(useBackend, ['backend'])
  },

});
</script>

<style lang="scss">
:root {
  --editor-font-size: 14pt;
}

$font-serif: Georgia, "IBM Plex Serif", "Times New Roman", Times, serif;
$font-sans: Verdana, "IBM Plex Sans", Geneva, Tahoma, sans-serif;
$font-mono: "Fira Code", "Courier New", Courier, monospace;
$font-poetry: "TeX Gyre Chorus", "URW Chancery L Medium";

$color-fg-quoted: #3cd49f;
$color-bg-quoted: #e7f8f2;
$color-bg-quoted-quoted: #c7f0e2;
$color-fg-dt: inherit;
$color-bg-dt: #ffc5a5;
$color-fg-dd: inherit;
$color-bg-dd: #ffdecb;
$color-fg-link: blue;
$color-border-plain: #b59898;
$color-bg-index: #e7d49d;
$color-bg-term: #fff9e6;
$color-fg-index: #dc7200;

@mixin normal-text() {
  font-style: normal;
  font-weight: normal;
  vertical-align: baseline;
}

// .tiptap {}

.ProseMirror {
  background-color: #eeeae1;
  padding-left: 0.3rem;
  font-family: $font-serif;
  font-size: var(--editor-font-size);

  >*+* {
    margin-top: 0.75em;
  }

  // general text
  .serif-font {
    font-family: $font-serif;
    font-size: var(--editor-font-size);
    line-height: 1.5;
    letter-spacing: 0.01rem;
  }

  .sans-font {
    font-family: $font-sans;
    font-size: var(--editor-font-size);
  }

  .mono-font {
    font-family: $font-mono;
    font-size: var(--editor-font-size);
  }

  // selected node
  .ProseMirror-selectednode {
    background-color: #3584e4 !important;
    color: rgb(220, 220, 220) !important;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: bold;
    line-height: normal;
    margin: 0;
    margin-top: 1rem;
  }

  h1 {
    font-size: calc(var(--editor-font-size) * 2);
  }

  h2 {
    font-size: calc(var(--editor-font-size) * 1.8);
  }

  h3 {
    font-size: calc(var(--editor-font-size) * 1.6);
  }

  h4 {
    font-size: calc(var(--editor-font-size) * 1.4);
  }

  h5 {
    font-size: calc(var(--editor-font-size) * 1.2);
  }

  h6 {
    font-size: calc(var(--editor-font-size));
  }

  span.br::before {
    content: "↵";
  }

  span.br.soft::before {
    content: "⏎";
  }

  div.div {
    border: 2px dotted rgb(136, 203, 237);
    border-radius: .3rem;
  }

  div.figure {
    display: block;
    background-color: rgb(255, 204, 255);
    border-radius: 1rem 1rem .3rem .3rem;
    padding: .1rem 1rem;
    margin: .2rem 0rem;
  }

  div.figure div.figure-caption {
    text-align: center;
    border: 2px solid rgb(254, 46, 254);
    border-radius: .7rem .7rem .3rem .3rem;
    margin-bottom: .5rem;

    & div.short-caption {
      font-size: smaller;
      border-bottom: 1px dashed rgb(152, 13, 152);
      background-color: rgb(228, 200, 228);
      border-radius: .7rem .7rem .3rem .3rem;
      margin-bottom: .3rem;
    }

    & p {
      text-indent: 0;
    }
  }

  // taken from https://tiptap.dev/api/nodes/table
  table {
    border-collapse: separate;
    border-spacing: 0px;
    table-layout: fixed;
    max-width: 98%;
    margin: 0;
    overflow: hidden;

    caption {
      text-align: center;
      margin-bottom: 0;
      background-color: #8f8f8f;
      padding: 0;

      & div.short-caption {
        font-size: smaller;
        border-bottom: 1px dashed rgb(59, 59, 59);
        background-color: #c0c0c0;
        margin-bottom: .3rem;
      }

      & p {
        text-indent: 0;
      }
    }

    thead>tr>th:first-of-type,
    thead>tr>td:first-of-type,
    tfoot>tr>th:first-of-type,
    tfoot>tr>td:first-of-type {
      border-left: .5rem solid #ccc;
    }

    thead>tr>th:last-of-type,
    thead>tr>td:last-of-type,
    tfoot>tr>th:last-of-type,
    tfoot>tr>td:last-of-type {
      border-right: .5rem solid #ccc;
    }

    tbody {

      &:nth-of-type(odd)>tr>th:first-child,
      &:nth-of-type(odd)>tr>td:first-child {
        border-left: .5rem solid #ffffa0;
      }

      &:nth-of-type(odd) tr>th:last-child,
      &:nth-of-type(odd) tr>td:last-child {
        border-right: .5rem solid #ffffa0;
      }

      &:nth-of-type(even) tr>th:first-child,
      &:nth-of-type(even) tr>td:first-child {
        border-left: .5rem solid #a0ffff;
      }

      &:nth-of-type(even) tr>th:last-child,
      &:nth-of-type(even) tr>td:last-child {
        border-right: .5rem solid #a0ffff;
      }
    }

    td,
    th {
      display: table-cell;
      min-width: 1em;
      border: 2px solid #ced4da;
      padding: 3px 5px;
      vertical-align: top;
      box-sizing: border-box;
      position: relative;

      >* {
        margin-bottom: 0;
      }

      &.cell-of-blocks {
        // background-color: rgb(250, 255, 231);
        border: 3px solid brown;
      }
    }

    th {
      font-weight: bold;
      text-align: left;
      background-color: #f1f3f5;
    }

    .selectedCell:after {
      z-index: 2;
      position: absolute;
      content: "";
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background: rgba(200, 200, 255, 0.4);
      pointer-events: none;
    }

    .column-resize-handle {
      position: absolute;
      right: -2px;
      top: 0;
      bottom: -2px;
      width: 4px;
      background-color: #adf;
      pointer-events: none;
    }

    p {
      margin: 0;
    }
  }

  .resize-cursor {
    cursor: ew-resize;
    cursor: col-resize;
  }

  q {
    display: inline;
    background-color: $color-bg-quoted;

    q {
      background-color: $color-bg-quoted-quoted;
    }
  }

  q::before {
    content: '';
    background-color: $color-bg-quoted;
  }

  q::after {
    content: '';
    background-color: $color-bg-quoted;
  }

  span.auto-delimiters::before {
    content: attr(open-delimiter);
  }

  span.auto-delimiters::after {
    content: attr(close-delimiter);
  }

  span.pandoc-link {
    text-decoration: underline;
    color: $color-fg-link;
  }

  span.math {
    background: pink;
  }

  div[class=div] {
    border: dotted 2px #8bc6ff;
  }

  span.plain {
    display: block;
    border: 2px dotted $color-border-plain;
  }

  blockquote {
    background-color: $color-bg-quoted;
    border: 0.1rem solid $color-fg-quoted;
    border-radius: 1rem;
    margin-left: 2rem;
    padding: 0.2rem 0.6rem;
    font-size: calc(var(--editor-font-size)*0.9);

    q {
      background-color: $color-bg-quoted-quoted;
    }
  }

  dl dt {
    background-color: $color-bg-dt;
    border-radius: 0.4rem;
    padding: 0.1rem 0.2rem;
    margin-right: 20%;
  }

  dl dd {
    background-color: $color-bg-dd;
    border-radius: 0.4rem;
    margin-left: 2rem;
    margin-top: 0.4rem;
    padding: 0.1rem 0.2rem;
  }

  dd+dt {
    margin-top: 0.4rem;
  }

  sup,
  sub {
    font-size: smaller;
  }

  .unknown-custom-style {
    text-decoration: underline dotted 4px #8bc6ff;
  }

  // span.custom-style {
  //   background-color: #b3daff;
  // }

  p {
    text-indent: 1rem;
  }

  div.line-block {
    border: 1px solid blue;
    margin-top: 2px;
    margin-bottom: 2px;
  }

  div.line-block p.line {
    text-indent: 0;
    margin-top: 0;
    margin-bottom: 0;
    font-family: monospace;
  }

  pre.code-block {
    padding: 4px;
    background-color: black;
    color: lightgrey;

    & code {
      font-family: $font-mono;

      & * {
        font-family: $font-mono;
      }
    }
  }

  .raw-inline {
    padding: 4px;
  }

  samp.raw-inline {
    font-family: $font-mono;
    background-color: black;
    color: rgb(199, 235, 235);
    font-size: smaller;
    font-variant: normal;
    font-weight: normal;

    &.format-context {
      color: lightgreen;
      padding: 2px;
    }
  }

  .raw-block {
    text-indent: 0px;
    padding: 4px;
    border: 1px solid black;
  }

  // .raw-block::before {
  //   display: block;
  //   width: auto;
  //   content: attr(data-format);
  //   padding: 3px;
  //   background-color: rgb(125, 125, 125);
  //   color: antiquewhite;
  //   font-family: monospace;
  //   font-size: small;
  // }

  .raw-inline,
  .raw-block code {
    text-indent: 0px;
    font-family: monospace !important;
    font-size: 12pt;
    font-style: normal;
    font-weight: normal;
    font-variant: normal;
    white-space: pre-wrap;
    margin: 0px;
  }

  .raw-inline.format-context,
  .raw-block.format-context {
    color: rgb(150, 220, 150) !important;
    background: black !important;
  }

  .ProseMirror-search-match,
  .search-replace-found {
    // color: white;
    // background-color: rgb(225, 113, 0);
    text-decoration-line: underline;
    text-decoration-color: blue;
    text-decoration-style: dashed;
    text-decoration-thickness: 4px;
    text-decoration-skip-ink: auto;
  }

  .ProseMirror-active-search-match {
    background-color: #00aaff54;
    color: white
  }

  /* metadata */
  dl.meta-map {
    margin: .2rem 0 .1rem 0;
    font-size: smaller;

    & dt {
      background-color: rgb(0, 137, 175);
      color: white;
      max-width: 50%;
      border-radius: 1rem 1rem 0 0;
      padding-top: .3rem;
      padding-bottom: .2rem;
      padding-left: 1rem;
      padding-right: 1rem;
      margin: 0;
    }

    & dd {
      background-color: rgb(170, 210, 222);
      color: black;
      border-radius: 0;
      border-bottom-right-radius: 1rem;
      border-top-right-radius: 1rem;
      border: .2rem solid rgb(0, 137, 175);
      margin: 0 .4rem 0 0;
      padding: 0 1rem;

      & p {
        margin: 0;
        text-indent: 0;
      }

      & .meta-blocks p::before,
      & .meta-list> :not(.meta-map)::before {
        display: inline-block;
        width: 1rem;
        content: ' ';
      }

      & .meta-blocks p:first-child::before,
      & .meta-list>.meta-value:not(.meta-map)::before {
        position: relative;
        left: -.3rem;
        content: '-';
      }
    }
  }

  div.index {
    border: .2rem solid $color-fg-index;
    border-radius: .3rem;
  }

  div.index::before {
    display: block;
    background-color: $color-fg-index;
    color: $color-bg-index;
    text-align: center;
    content: 'Index';
  }

  div.index[data-index-name]::before {
    content: 'Index named "' attr(data-index-name) '"';
  }

  div.index-term {
    border: .2rem solid $color-fg-index;
    border-radius: .3rem;
    margin: .3rem .2rem;
    background-color: $color-bg-term;
  }

  div.index-term::before {
    display: block;
    background-color: $color-fg-index;
    color: $color-bg-term;
    padding-left: 1rem;
  }

  div.index-term[id]::before {
    content: 'id: "' attr(id) '"';
  }

  div.index-term[id][data-sort-key]::before {
    content: 'id "' attr(id) '", sorted @' attr(data-sort-key);
  }

  span.index-ref {
    border-bottom: 3px solid $color-fg-index;
  }

  span.cite {
    color: rgb(80, 10, 127);
    background-color: rgb(229, 189, 255);
  }
}
</style>

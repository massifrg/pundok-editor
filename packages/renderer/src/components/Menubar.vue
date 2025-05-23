<template>
  <div class="toolbar">
    <q-bar v-if="editor" class="q-py-xs">
      <NewDocumentButton v-if="gui.newDocument" @new-document="newDocument" />
      <span v-if="gui.newDocument" class="button-separator" />

      <!-- <ToolbarButton icon="mdi-content-save" @click="$emit('saveContent')" title="save (pandoc JSON)" /> -->
      <ToolbarButton icon="mdi-content-save" @click="$emit('saveContent')" title="save (pandoc JSON)">
        <q-badge v-if="!!savedExportedColor" :color="savedExportedColor" floating rounded />
      </ToolbarButton>

      <span v-if="gui.importButton || gui.exportButton" class="button-separator" />
      <ImportToolbarButton v-if="gui.importButton" :editor="editor" />
      <ExportToolbarButton v-if="gui.exportButton" :editor="editor" />

      <span class="button-separator" />

      <ToolbarButton icon="mdi-undo" :disabled="!editor.can().undo()" title="undo" shortcut="SK_UNDO"
        @click="editor.chain().undo().redecorateIndexRefs().run()" />
      <ToolbarButton icon="mdi-redo" :disabled="!editor.can().redo()" title="redo" shortcut="SK_REDO"
        @click="editor.commands.redo()" />

      <span class="button-separator" />
      <ToolbarButton icon="mdi-repeat-variant" :disabled="!editor.can().repeatCommand()" :title="repeatCommandTitle()"
        @click="editor.commands.repeatCommand()" />

      <span class="button-separator" />

      <ToolbarButton icon="mdi-format-paragraph" :disabled="!editor.can().togglePlain()" shortcut="SK_TOGGLE_PLAIN"
        @click="
          editor.commands.runRepeatableCommand('togglePlain', 'Plain ↔ Para')
          " title="toggle Plain/Para" />

      <!-- <span class="button-separator" /> -->

      <!--
      <CustomBlocksButtons v-if="!nonEmptySelection" :editor="editor" :current-blocks="currentNodesWithPos"
        @set-custom-style="setCustomStyle" @unset-custom-style="unsetCustomStyle" />
        -->

      <!-- <ToolbarButton icon="mdi-palette-swatch-variant" :styleactive="isInlineCustomStyleActive"
        :disabled="!nonEmptySelection" no-caps size="small" dense :label="currentInlineCustomStylesLabel"
        :title="`inline custom style (currently active: ${currentInlineCustomStylesLabel})`">
        <CustomMarkMenu :editor="editor"
          :active-custom-styles="currentInlineCustomStyles.map(s => s.mark.attrs.customStyle)"
          @unset-custom-mark="unsetCustomMark" @set-custom-mark="setCustomMark" />
      </ToolbarButton> -->

      <!-- <span class="button-separator" /> -->

      <CustomWrapperMenu :editor="editor" wrapper-type-name="div" pandoc-type="Div" shortcut="SK_TOGGLE_DIV" />

      <span class="button-separator" />

      <CustomWrapperMenu :editor="editor" wrapper-type-name="figure" pandoc-type="Figure" shortcut="SK_TOGGLE_FIGURE"
        wrap-icon="mdi-application-import" unwrap-icon="mdi-application-export" />
      <ToolbarButton v-if="inFigure()" icon="mdi-page-layout-header" title="wrap selection in Caption"
        @click="wrapInFigureCaption()" />

      <span class="button-separator" />

      <ToolbarButton icon="mdi-format-quote-close" title="toggle blockquote" shortcut="SK_TOGGLE_BLOCKQUOTE"
        :disabled="!editor.can().toggleBlockquote()" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleBlockquote', 'toggle Blockquote')
            .focus()
            .run()
          " />

      <span class="button-separator" />

      <ImageButton :editor="editor" />

      <span class="button-separator" />

      <InsertNoteButton :editor="editor" :disabled="!editor.can().insertNote()" shortcut="SK_INSERT_NOTE"
        @insert-note="insertNote" />

      <span class="button-separator" />

      <TableTools :editor="editor" :current-nodes-with-pos="currentNodesWithPos" />

      <span class="button-separator" />

      <ToolbarButton icon="mdi-minus" title="insert HorizontalRule" :disabled="!editor.can().setHorizontalRule()"
        @click="
          editor.commands.runRepeatableCommand(
            'setHorizontalRule',
            'insert HorizontalRule',
          )
          " />

      <span class="button-separator" />

      <ToolbarButton v-if="gui.projectStructure && project" icon="mdi-file-tree" title="show project structure"
        @click="showProjectStructure()" />

      <q-space />

      <q-badge v-if="gui.showEditorVersion" color="positive"><i>{{ version }}</i></q-badge>
    </q-bar>
    <q-bar v-if="editor" class="q-py-xs">
      <ToolbarButton icon="mdi-tag-remove" :disabled="!editor.can().removeAllMarks()"
        title="clear all marks in selection" shortcut="SK_REMOVE_MARKS"
        @click="editor.chain().removeAllMarks().focus().run()" />
      <ToolbarButton icon="mdi-format-italic" :styleactive="isActive('emph')" title="emphasis" shortcut="SK_TOGGLE_EMPH"
        @click="
          editor
            .chain()
            .runRepeatableCommand('toggleEmph', 'toggle Emph')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-format-bold" :styleactive="isActive('strong')" title="strong" shortcut="SK_TOGGLE_STRONG"
        @click="
          editor
            .chain()
            .runRepeatableCommand('toggleStrong', 'toggle Strong')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-format-underline" :styleactive="isActive('underline')" title="underline"
        shortcut="SK_TOGGLE_UNDERLINE" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleUnderline', 'toggle Underline')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-format-strikethrough" :styleactive="isActive('strikeout')" title="strikeout"
        shortcut="SK_TOGGLE_STRIKEOUT" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleStrikeout', 'toggle Strikeout')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-format-superscript" :styleactive="isActive('superscript')" title="superscript"
        shortcut="SK_TOGGLE_SUPERSCRIPT" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleSuperscript', 'toggle Superscript')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-format-subscript" :styleactive="isActive('subscript')" title="subscript"
        shortcut="SK_TOGGLE_SUBSCRIPT" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleSubscript', 'toggle Subscript')
            .focus()
            .run()
          " />
      <ToolbarButton text="K" :styleactive="isActive('smallcaps')" title="small caps" shortcut="SK_TOGGLE_SMALLCAPS"
        @click="
          editor
            .chain()
            .runRepeatableCommand('toggleSmallcaps', 'toggle Smallcaps')
            .focus()
            .run()
          " />
      <ToolbarButton text="‘a’" :styleactive="isActive('quoted', { quoteType: 'SingleQuote' })" title="single quoted"
        shortcut="SK_TOGGLE_SINGLEQUOTE" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleSingleQuoted', 'toggle SingleQuoted')
            .focus()
            .run()
          " />
      <ToolbarButton text="“a”" :styleactive="isActive('quoted', { quoteType: 'DoubleQuote' })" title="double quoted"
        shortcut="SK_TOGGLE_DOUBLEQUOTE" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleDoubleQuoted', 'toggle DoubleQuoted')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-language-c" :styleactive="isActive('code')" title="toggle Code" shortcut="SK_TOGGLE_CODE"
        @click="
          editor
            .chain()
            .runRepeatableCommand('toggleCode', 'toggle Code')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-link" :styleactive="isActive('link')" title="toggle Link" shortcut="SK_TOGGLE_LINK"
        @click="
          editor
            .chain()
            .runRepeatableCommand('toggleLink', 'toggle Link')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-book-account" :styleactive="isActive('cite')" title="toggle Cite"
        shortcut="SK_TOGGLE_CITE" @click="
          editor
            .chain()
            .runRepeatableCommand('toggleCite', 'toggle Cite')
            .focus()
            .run()
          " />
      <ToolbarButton icon="mdi-sigma" :styleactive="isActive('math')" title="math" shortcut="SK_TOGGLE_MATH" @click="
        editor
          .chain()
          .runRepeatableCommand('toggleMath', 'toggle Math')
          .focus()
          .run()
        " />
      <!-- <q-btn v-if="isActive('math')" label="D/I" title="toggle Display/Inline Math" round
        @click="editor.chain().runRepeatableCommand('toggleMathType', 'toggle MathType').focus().run()" /> -->

      <span class="button-separator" />

      <ToolbarButton icon="mdi-format-letter-case-lower" title="convert to lower case" shortcut="SK_LOWERCASE" @click="
        editor
          .chain()
          .runRepeatableCommand('toLowercase', 'convert to lower case')
          .focus()
          .run()
        " />
      <ToolbarButton icon="mdi-format-letter-case-upper" title="convert to upper case" shortcut="SK_UPPERCASE" @click="
        editor
          .chain()
          .runRepeatableCommand('toUppercase', 'convert to upper case')
          .focus()
          .run()
        " />
      <ToolbarButton icon="mdi-format-letter-case" title="convert to upper case the first letter of every word"
        shortcut="SK_UPPERCASEFIRST" @click="
          editor
            .chain()
            .runRepeatableCommand(
              'toUppercaseFirst',
              'convert to uppercase the first letter of every word',
            )
            .focus()
            .run()
          " />

      <span class="button-separator" />

      <RawInlineMenu :editor="editor" :sortable="true" />
      <RawBlockMenu :editor="editor" :sortable="true" />

      <span class="button-separator" />

      <IndicesButtons :editor="editor" size="xs" button-style="menubar" />

      <span class="button-separator" />

      <ToolbarButton icon="mdi-magnify" title="search and replace" shortcut="SK_SHOW_SEARCH_DIALOG"
        @click="$emit('toggleSearchAndReplaceDialog')" />

      <WholeDocTransformsButton :editor="editor" />

      <span class="button-separator" />

      <ElementSelectionButton :editor="editor" />

      <!-- <ToolbarButton icon="mdi-bug-check" @click="debug()" /> -->

      <q-space />

      <q-circular-progress v-if="operationInProgress" color="orange" indeterminate rounded size="1rem"
        class="q-ma-xs" />

      <CodemirrorButton :editor="editor" />
      <CharsTableButton :editor="editor" />

      <q-space />

      <q-badge v-if="gui.showConfiguration && configSummaries.length === 1" color="accent"><b>{{ configuration?.name ||
          'unknown' }}</b></q-badge>
      <ChooseConfigButton :current-configuration-name="configuration?.name"
        title="reload document with a different configuration" @change-configuration="reloadWithConfiguration" />
      <q-badge v-if="gui.showEditorKey" color="secondary"><b>{{ editorKey }}</b></q-badge>
    </q-bar>
    <BreadCrumb v-if="editor" :editor="editor" :current-nodes-with-pos="currentNodesWithPos"
      @edit-node-or-mark-attributes="editNodeOrMarkAttributes" />
  </div>
</template>

<script lang="ts">
import type { Node, Mark } from '@tiptap/pm/model';
import { MarkRange, NodeWithPos } from '@tiptap/vue-3';
import BreadCrumb from './BreadCrumb.vue';
import CharsTableButton from './CharsTableButton.vue';
import ChooseConfigButton from './ChooseConfigButton.vue';
import CodemirrorButton from './CodemirrorButton.vue';
import CustomWrapperMenu from './CustomWrapperMenu.vue';
// import CustomMarkMenu from './CustomMarkMenu.vue'
// import CustomBlocksButtons from './CustomBlocksButtons.vue';
import ElementSelectionButton from './ElementSelectionButton.vue';
import ImageButton from './ImageButton.vue';
import IndicesButtons from './IndicesButtons.vue';
import InsertNoteButton from './InsertNoteButton.vue';
import ImportToolbarButton from './ImportToolbarButton.vue';
import ExportToolbarButton from './ExportToolbarButton.vue';
import NewDocumentButton from './NewDocumentButton.vue';
import RawInlineMenu from './RawInlineMenu.vue';
import RawBlockMenu from './RawBlockMenu.vue';
import TableTools from './TableTools.vue';
import ToolbarButton from './ToolbarButton.vue';
import WholeDocTransformsButton from './WholeDocTransformsButton.vue';
import { TypeOrNode } from '../schema/extensions/HelperCommandsExtension';
// import TextAlignMenubarItem from "./TextAlignMenubarItem.vue";
// import VerticalAlignMenubarItem from "./VerticalAlignMenubarItem.vue";
import {
  COLOR_JUST_EXPORTED,
  COLOR_UNSAVED,
  ConfigurationSummary,
  CustomStyleInstance,
  MARK_NAME_SPAN,
  NODE_NAME_FIGURE,
  NODE_NAME_FIGURE_CAPTION,
  NODE_NAME_PARAGRAPH,
  version,
} from '../common';
import { useBackend } from '../stores';
import {
  setActionNewEmptyDocument,
  setActionShowProjectStructureDialog,
} from '../actions';
import {
  currentRepeatableCommandTooltip,
  editorKeyFromState,
  getEditorConfiguration,
  getEditorProject,
} from '../schema';
import { EditorGUIProps } from './EditorGUIProps';
import { mapState } from 'pinia';
import { getTextMarkRangesBetween } from '../schema/helpers';

export default {
  components: {
    BreadCrumb,
    CharsTableButton,
    ChooseConfigButton,
    CodemirrorButton,
    // CustomBlocksButtons,
    // CustomMarkMenu,
    CustomWrapperMenu,
    ElementSelectionButton,
    ExportToolbarButton,
    ImageButton,
    IndicesButtons,
    InsertNoteButton,
    ImportToolbarButton,
    NewDocumentButton,
    RawInlineMenu,
    RawBlockMenu,
    // TextAlignMenubarItem,
    // VerticalAlignMenubarItem,
    TableTools,
    ToolbarButton,
    WholeDocTransformsButton,
  },
  props: [
    'editor',
    'currentNodesWithPos',
    'guiProps',
    'savedChanges',
    'exportedChanges',
    'operationInProgress',
  ],
  emits: [
    'saveContent',
    // 'exportAgain',
    'showConfigurationsDialog',
    'toggleSearchAndReplaceDialog',
    'editNodeOrMarkAttributes',
    'reloadWithConfiguration',
  ],
  data() {
    return {
      version: version(),
      configSummaries: [] as ConfigurationSummary[],
      // actions: useActions(),
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    gui() {
      console.log(JSON.stringify(this.guiProps));
      return this.guiProps as EditorGUIProps;
    },
    editorKey() {
      return editorKeyFromState(this.editor.state);
    },
    configuration() {
      return getEditorConfiguration(this.editor);
    },
    project() {
      return getEditorProject(this.editor);
    },
    savedExportedColor(): string | undefined {
      const exported = this.exportedChanges;
      const saved = this.savedChanges;
      if (exported && !saved) return COLOR_JUST_EXPORTED;
      else if (!(exported || saved)) return COLOR_UNSAVED;
      else return undefined;
    },
    currentParagraph(): NodeWithPos | undefined {
      return [...this.currentNodesWithPos]
        .reverse()
        .find(({ node }) => node.type.name === NODE_NAME_PARAGRAPH);
    },
    nonEmptySelection() {
      const editor = this.editor;
      if (editor) {
        const selection = editor.state.selection;
        return selection && !selection.empty;
      }
      return false;
    },
    // currentTextAlign() {
    //   const p_or_c = this.currentParagraph || this.currentTableCell;
    //   return p_or_c && p_or_c.node.attrs.textAlign;
    // },
    // currentVerticalAlign() {
    //   const c = this.currentTableCell;
    //   return c && c.node.attrs.verticalAlign;
    // },
    currentNodeAndMarkNames(): string[] {
      const names: string[] = (this.currentNodesWithPos as NodeWithPos[])
        .map(({ node }) => {
          const custom = node.attrs.customStyle;
          return custom
            ? `${node.type.name}(${custom.className})`
            : node.type.name;
        })
        .filter((name) => name !== 'text');
      this.currentTextMarks
        .map((markRange) => markRange.mark)
        .forEach((mark) => {
          const custom = mark.attrs.customStyle;
          const name = custom
            ? `${mark.type.name}(${custom.className})`
            : mark.type.name;
          names.push(name);
        });
      return names;
    },
    currentTextMarks(): MarkRange[] {
      const { from, to } = this.editor.state.selection;
      return getTextMarkRangesBetween(from, to, this.editor.state.doc);
    },
    currentInlineCustomStyles(): MarkRange[] {
      return this.currentTextMarks.filter(
        (m) =>
          m.mark.type.name === MARK_NAME_SPAN && !!m.mark.attrs.customStyle,
      );
    },
    currentInlineCustomStylesLabel(): string {
      const styles = this.currentInlineCustomStyles;
      return styles
        ? styles.map((cs) => cs.mark.attrs.customStyle).join(', ')
        : '';
    },
    isInlineCustomStyleActive() {
      return this.currentInlineCustomStyles.length > 0;
    },
  },
  mounted() {
    this.backend?.availableConfigurations().then((configs) => {
      this.configSummaries = configs;
    });
  },
  methods: {
    isActive(name: string, attrs?: Record<string, any>) {
      return this.editor && this.editor.isActive(name, attrs);
    },
    getAttribute(name: string, attrName: string) {
      const attrs = this.editor && this.editor.getAttributes(name);
      return (attrs && attrs[attrName]) || '';
    },
    updateTextAlign(newValue: string, oldValue: string) {
      this.editor.chain().focus().setTextAlign(newValue).run();
    },
    updateVerticalAlign(newValue: string, oldValue: string) {
      // this.editor.chain().focus().setVerticalAlign(newValue).run();
    },
    editNodeOrMarkAttributes(nom: Node | Mark) {
      this.$emit('editNodeOrMarkAttributes', nom);
    },
    newDocument(configurationName?: string) {
      setActionNewEmptyDocument(this.editor.state, configurationName);
    },
    setCustomStyle(typeOrNode: TypeOrNode, style: CustomStyleInstance) {
      this.editor
        .chain()
        .runRepeatableCommand(
          'setCustomStyle',
          `style as "${style.styleDef.name}"`,
          typeOrNode,
          style,
        )
        .run();
    },
    unsetCustomStyle(typeOrNode: TypeOrNode, style: CustomStyleInstance) {
      this.editor
        .chain()
        .runRepeatableCommand(
          'unsetCustomStyle',
          `remove "${style.styleDef.name}" style`,
          typeOrNode,
          style,
        )
        .run();
    },
    setCustomMark(markName: string, style: CustomStyleInstance) {
      // this.editor.chain().setCustomMark(markName, style).run()
      this.editor
        .chain()
        .runRepeatableCommand(
          'setCustomMark',
          `style as "${style.styleDef.name}"`,
          markName,
          style,
        )
        .run();
    },
    unsetCustomMark(markName: string, style: CustomStyleInstance) {
      this.editor
        .chain()
        .runRepeatableCommand(
          'unsetCustomMark',
          `remove "${style.styleDef.name}" style`,
          markName,
          style,
        )
        .run();
    },
    wrapInFigureCaption() {
      const editor = this.editor;
      editor.commands.wrapIn(
        editor.state.schema.nodes[NODE_NAME_FIGURE_CAPTION],
      );
    },
    insertNote(noteType: string) {
      const description =
        `insert a note` + (noteType ? ` of type "${noteType}"` : '');
      console.log(`insert note, ${description}`);
      this.editor
        .chain()
        .runRepeatableCommand('insertNote', description, noteType)
        .run();
    },
    inFigure() {
      return (this.currentNodesWithPos as NodeWithPos[]).find(
        (n) => n.node.type.name === NODE_NAME_FIGURE,
      );
    },
    showProjectStructure() {
      setActionShowProjectStructureDialog(this.editor.state);
    },
    repeatCommandTitle() {
      return currentRepeatableCommandTooltip(this.editor.state);
    },
    reloadWithConfiguration(configurationName: string) {
      this.$emit('reloadWithConfiguration', configurationName);
    },
    async debug() { },
  },
};
</script>

<style lang="scss">
.toolbar {
  background-color: #aaaaaa;
  // position: fixed;
  // top: 0;
  // left: 0;
  // height: var(--menubar-height);
  width: 100%;
}

span.button-separator {
  // margin: 0rem 0.3rem;
  width: 0.7rem;
  padding: 0rem;
  // border: 0.1rem solid black;
}

.buttonbar {
  padding: 0rem !important;
  margin: 0rem !important;
  background-color: lightgray !important;

  & button {
    min-height: 1.8rem;
    min-width: 1.6rem;
    padding: 2px;
    border-radius: 0.5rem;

    &.disabled {
      opacity: 0.5;
    }

    &.styleactive {
      border: 0.2rem solid orangered;
    }
  }

  & select {
    font-size: smaller;
  }

  & .iconfont {
    font-size: 0.9rem;
  }

  & .left-padding {
    padding-left: 0.2rem;
  }
}
</style>

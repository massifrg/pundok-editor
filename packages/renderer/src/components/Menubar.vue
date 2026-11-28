<template>
  <div class="toolbar">
    <q-bar v-if="editor" class="q-py-xs">
      <NewDocumentButton v-if="gui.newDocument" @new-document="newDocument" />
      <span v-if="gui.newDocument" class="button-separator" />

      <OpenButton
        v-if="gui.openButton"
        :key="`open-${documentMenuRefreshKey}`"
        :editor="editor"
      />

      <SaveButton
        :editor="editor"
        :text-color="savedColor"
        :disabled="documentLoading"
      />

      <OutputRenderersButton
        v-if="gui.renderButton"
        :key="`render-${documentMenuRefreshKey}`"
        :editor="editor"
        :rendering-targets="renderingTargets"
        @render="renderOutput"
        @stop-rendering="stopRendering"
      />
      <span v-if="gui.renderButton" class="button-separator" />

      <!-- <ExportProgress v-if="remoteWorkInProgress" :editor-key="editorKey" />

      <span class="button-separator" /> -->

      <InsertDocumentButton :editor="editor" />

      <span class="button-separator" />

      <ToolbarButton
        icon="undo"
        :disabled="!editor.can().undo()"
        :title="$t('undo')"
        :shortcut="SK.UNDO"
        @click="editor.chain().undo().redecorateIndexRefs().run()"
      />
      <ToolbarButton
        icon="redo"
        :disabled="!editor.can().redo()"
        :title="$t('redo')"
        :shortcut="SK.REDO"
        @click="editor.commands.redo()"
      />

      <span class="button-separator" />
      <ToolbarButton
        icon="repeat_command"
        :disabled="!editor.can().repeatCommand()"
        :title="repeatCommandTitle()"
        @click="editor.commands.repeatCommand()"
      />

      <q-toggle
        v-model="swapBlocksActive"
        icon="swap_blocks"
        :title="swapBlocksToggleTooltip()"
        @click="editor.commands.toggleSwapBlocks()"
      />

      <IndicesButtons :editor="editor" size="xs" button-style="menubar" />
      <span class="button-separator" />
      <ToolbarButton
        icon="search"
        :title="$t('show.searchAndReplace')"
        :shortcut="SK.SHOW_SEARCH_DIALOG"
        @click="$emit('toggleSearchAndReplaceDialog')"
      />
      <CodemirrorButton :editor="editor" />
      <CharsTableButton :editor="editor" />
      <q-badge
        v-if="gui.showConfiguration && configSummaries.length === 1"
        color="accent"
        ><b>{{ configuration?.name || 'unknown' }}</b></q-badge
      >
      <ChooseConfigButton
        :current-configuration-name="configuration?.name"
        :current-project-name="project?.name"
        :title="$t('document.reloadWithConfiguration')"
        @change-configuration="reloadWithConfiguration"
      />

      <ToolbarButton
        v-if="gui.projectStructure && project"
        icon="project_structure"
        :title="$t('show.projectStructure')"
        @click="showProjectStructure()"
      />
      <q-btn-dropdown
        v-if="project"
        :title="$t('projectMenu.title')"
        icon="menu"
        color="grey-5"
        dense
        size="sm"
        dropdown-icon="menu_down"
        @show="refreshGitStatus"
      >
        <q-list>
          <q-item clickable v-close-popup @click="showConfigurationEditor()"
            ><q-item-section>{{
              $t('projectMenu.editConfiguration')
            }}</q-item-section></q-item
          >
          <q-item
            v-if="!gitManaged"
            clickable
            v-close-popup
            @click="$emit('initializeGitProject')"
          >
            <q-item-section>{{
              $t('projectMenu.initializeGit')
            }}</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="$emit('manageGitProject')"
            ><q-item-section>{{
              $t('projectMenu.manageChanges')
            }}</q-item-section></q-item
          >
          <q-item clickable v-close-popup @click="$emit('checkGitUpdates')"
            ><q-item-section>{{
              $t('projectMenu.checkUpdates')
            }}</q-item-section></q-item
          >
          <q-item clickable v-close-popup @click="$emit('shareGitProject')"
            ><q-item-section>{{
              $t('projectMenu.share')
            }}</q-item-section></q-item
          >
          <q-item clickable v-close-popup @click="$emit('connectGitProject')"
            ><q-item-section>{{
              $t('projectMenu.connect')
            }}</q-item-section></q-item
          >
          <q-item clickable v-close-popup @click="$emit('cloneGitProject')"
            ><q-item-section>{{
              $t('projectMenu.clone')
            }}</q-item-section></q-item
          >
        </q-list>
      </q-btn-dropdown>
      <ToolbarButton
        v-else
        icon="cloud_download"
        :title="$t('projectMenu.clone')"
        @click="$emit('cloneGitProject')"
      />

      <q-space />
      <ToolbarButton
        v-if="gui.isDevelopmentMode"
        icon="debug"
        title="debug"
        @click="debug"
      />

      <q-badge v-if="gui.showEditorVersion" color="positive"
        ><i>{{ version }}</i></q-badge
      >
    </q-bar>
    <q-bar v-if="editor" ref="secondRow" class="q-py-xs menubar-second-row">
      <div ref="buttonSetsContainer" class="button-sets-container">
        <ExpandableButtonsSet :default-buttons="inlineButtonDefinitions">
          <template #button="{ button, visible, collapse }">
            <ToolbarButton
              v-if="button.name === 'removeMarks' && visible"
              icon="marks_clear"
              :disabled="!editor.can().removeAllMarks()"
              :title="$t('clearAllMarks')"
              :shortcut="SK.REMOVE_MARKS"
              @click="editor.chain().removeAllMarks().focus().run()"
            />
            <ToolbarButton
              v-if="button.name === 'emph' && visible"
              :icon="iconFor('Emph')"
              :styleactive="isActive('emph')"
              :title="toggleLabelForMark('emph')"
              :shortcut="SK.TOGGLE_EMPH"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleEmph',
                    toggleLabelForMark('emph'),
                  )
                  .focus()
                  .run()
              "
            />
            <ToolbarButton
              v-if="button.name === 'strong' && visible"
              :icon="iconFor('Strong')"
              :styleactive="isActive('strong')"
              :title="toggleLabelForMark('strong')"
              :shortcut="SK.TOGGLE_STRONG"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleStrong',
                    toggleLabelForMark('strong'),
                  )
                  .focus()
                  .run()
              "
            />
            <ImageButton
              v-if="button.name === 'image' && visible"
              :editor="editor"
              @click="collapse"
            />
            <InsertNoteButton
              v-if="button.name === 'insertNote' && visible"
              :editor="editor"
              :disabled="!editor.can().insertNote()"
              :shortcut="SK.INSERT_NOTE"
              @insert-note="insertNoteAndCollapse($event, collapse)"
            />
            <RawInlineButton
              v-if="button.name === 'rawInline' && visible"
              :editor="editor"
              :sortable="true"
              @click="collapse"
            />
            <ToolbarButton
              v-if="button.name === 'underline' && visible"
              :icon="iconFor('Underline')"
              :styleactive="isActive('underline')"
              :title="toggleLabelForMark('underline')"
              :shortcut="SK.TOGGLE_UNDERLINE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleUnderline',
                    toggleLabelForMark('underline'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'strikeout' && visible"
              :icon="iconFor('Strikeout')"
              :styleactive="isActive('strikeout')"
              :title="toggleLabelForMark('strikeout')"
              :shortcut="SK.TOGGLE_STRIKEOUT"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleStrikeout',
                    toggleLabelForMark('strikeout'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'superscript' && visible"
              :icon="iconFor('Superscript')"
              :styleactive="isActive('superscript')"
              :title="toggleLabelForMark('superscript')"
              :shortcut="SK.TOGGLE_SUPERSCRIPT"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleSuperscript',
                    toggleLabelForMark('superscript'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'subscript' && visible"
              :icon="iconFor('Subscript')"
              :styleactive="isActive('subscript')"
              :title="toggleLabelForMark('Subscript')"
              :shortcut="SK.TOGGLE_SUBSCRIPT"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleSubscript',
                    toggleLabelForMark('Subscript'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'smallcaps' && visible"
              :icon="iconFor('smallcaps')"
              :styleactive="isActive('smallcaps')"
              :title="toggleLabelForMark('smallCaps')"
              :shortcut="SK.TOGGLE_SMALLCAPS"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleSmallcaps',
                    toggleLabelForMark('smallCaps'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'singleQuoted' && visible"
              :icon="iconFor('singleQuoted')"
              :styleactive="isActive('quoted', { quoteType: 'SingleQuote' })"
              :title="toggleLabelForMark('singleQuoted')"
              :shortcut="SK.TOGGLE_SINGLEQUOTE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleSingleQuoted',
                    toggleLabelForMark('singleQuoted'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'doubleQuoted' && visible"
              :icon="iconFor('doubleQuoted')"
              :styleactive="isActive('quoted', { quoteType: 'DoubleQuote' })"
              :title="toggleLabelForMark('doubleQuoted')"
              :shortcut="SK.TOGGLE_DOUBLEQUOTE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleDoubleQuoted',
                    toggleLabelForMark('doubleQuoted'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'code' && visible"
              :icon="iconFor('Code')"
              :styleactive="isActive('code')"
              :title="toggleLabelForMark('Code')"
              :shortcut="SK.TOGGLE_CODE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleCode',
                    toggleLabelForMark('code'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'link' && visible"
              :icon="iconFor('Link')"
              :styleactive="isActive('link')"
              :title="toggleLabelForMark('Link')"
              :shortcut="SK.TOGGLE_LINK"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleLink',
                    toggleLabelForMark('link'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'cite' && visible"
              :icon="iconFor('Cite')"
              :styleactive="isActive('cite')"
              :title="toggleLabelForMark('Cite')"
              :shortcut="SK.TOGGLE_CITE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleCite',
                    toggleLabelForMark('cite'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'math' && visible"
              :icon="iconFor('Math')"
              :styleactive="isActive('math')"
              :title="toggleLabelForMark('Math')"
              :shortcut="SK.TOGGLE_MATH"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toggleMath',
                    toggleLabelForMark('math'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'lowercase' && visible"
              icon="case_to_lower"
              :title="$t('capitalize.lower')"
              :shortcut="SK.LOWERCASE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand('toLowercase', $t('capitalize.lower'))
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'uppercase' && visible"
              icon="case_to_upper"
              :title="$t('capitalize.upper')"
              :shortcut="SK.UPPERCASE"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand('toUppercase', $t('capitalize.upper'))
                  .focus()
                  .run();
                collapse();
              "
            />
            <ToolbarButton
              v-if="button.name === 'uppercasefirst' && visible"
              icon="case_to_upperfirst"
              :title="$t('capitalize.upperFirst')"
              :shortcut="SK.UPPERCASEFIRST"
              @click="
                editor
                  .chain()
                  .runRepeatableCommand(
                    'toUppercaseFirst',
                    $t('capitalize.upperFirst'),
                  )
                  .focus()
                  .run();
                collapse();
              "
            />
          </template>
        </ExpandableButtonsSet>
        <q-space v-if="!blockButtonsInThirdRow" />
        <div
          v-if="!blockButtonsInThirdRow"
          id="block-buttons-second-row"
          class="block-buttons-target"
        />
      </div>
      <span class="button-separator" />

      <WholeDocTransformsButton
        :editor="editor"
        :transformation-log="transformationLog"
        :transformation-failed="transformationFailed"
      />

      <span class="button-separator" />

      <!-- <ToolbarButton icon="mdi-cog-play" :title="$t('procedures on the whole document')"
        @click="globalProceduresDialogVisible = !globalProceduresDialogVisible">
        <GlobalProceduresDialog :visible="globalProceduresDialogVisible" :editor="editor"
          @show="globalProceduresDialogVisible = true" @hide="globalProceduresDialogVisible = false" />
      </ToolbarButton> -->

      <q-badge v-if="gui.showEditorKey" color="secondary"
        ><b>{{ editorKey }}</b></q-badge
      >
    </q-bar>
    <q-bar v-if="editor && blockButtonsInThirdRow" class="q-py-xs">
      <div id="block-buttons-third-row" class="block-buttons-target" />
    </q-bar>
    <Teleport
      v-if="editor"
      :to="
        blockButtonsInThirdRow
          ? '#block-buttons-third-row'
          : '#block-buttons-second-row'
      "
    >
      <ExpandableButtonsSet :default-buttons="blockButtonDefinitions">
        <template #button="{ button, visible, collapse }">
          <ToolbarButton
            v-if="button.name === 'togglePlain' && visible"
            icon="toggle_plain"
            :disabled="!editor.can().togglePlain()"
            :shortcut="SK.TOGGLE_PLAIN"
            :title="$t('togglePlainPara')"
            @click="
              editor.commands.runRepeatableCommand(
                'togglePlain',
                $t('togglePlainPara'),
              )
            "
          />
          <CustomWrapperMenu
            v-if="button.name === 'div' && visible"
            :editor="editor"
            wrapper-type-name="div"
            pandoc-type="Div"
            :shortcut="SK.TOGGLE_DIV"
            @click="collapse"
          />
          <CustomWrapperMenu
            v-if="button.name === 'figure' && visible"
            :editor="editor"
            wrapper-type-name="figure"
            pandoc-type="Figure"
            :shortcut="SK.TOGGLE_FIGURE"
            wrap-icon="figure_wrap"
            unwrap-icon="figure_unwrap"
            @click="collapse"
          />
          <ToolbarButton
            v-if="button.name === 'caption' && visible && inFigure()"
            icon="caption"
            :title="$t('wrapIn.Caption')"
            @click="
              wrapInFigureCaption();
              collapse();
            "
          />
          <ToolbarButton
            v-if="button.name === 'blockquote' && visible"
            icon="blockquote"
            :title="toggleLabelForNode('blockquote')"
            :shortcut="SK.TOGGLE_BLOCKQUOTE"
            :disabled="!editor.can().toggleBlockquote()"
            @click="
              editor
                .chain()
                .runRepeatableCommand(
                  'toggleBlockquote',
                  toggleLabelForNode('blockquote'),
                )
                .focus()
                .run();
              collapse();
            "
          />
          <ToolbarButton
            v-if="button.name === 'bulletlist' && visible"
            icon="bulletlist"
            :title="toggleLabelForNode('bulletList')"
            :shortcut="SK.TOGGLE_BULLETLIST"
            :disabled="!editor.can().toggleBulletList()"
            @click="
              editor
                .chain()
                .runRepeatableCommand(
                  'toggleBulletList',
                  toggleLabelForNode('bulletList'),
                )
                .focus()
                .run();
              collapse();
            "
          />
          <ToolbarButton
            v-if="button.name === 'orderedlist' && visible"
            icon="orderedlist"
            :title="toggleLabelForNode('orderedList')"
            :shortcut="SK.TOGGLE_ORDEREDLIST"
            :disabled="!editor.can().toggleOrderedList()"
            @click="
              editor
                .chain()
                .runRepeatableCommand(
                  'toggleOrderedList',
                  toggleLabelForNode('orderedList'),
                )
                .focus()
                .run();
              collapse();
            "
          />
          <TableTools
            v-if="button.name === 'tableTools' && visible"
            :editor="editor"
            :current-nodes-with-pos="currentNodesWithPos"
            @click="collapse"
          />
          <ToolbarButton
            v-if="button.name === 'horizontalRule' && visible"
            icon="horizontal_rule"
            :title="$t('insert.HorizontalRule')"
            :disabled="!editor.can().setHorizontalRule()"
            @click="
              editor.commands.runRepeatableCommand(
                'setHorizontalRule',
                $t('insert.HorizontalRule'),
              );
              collapse();
            "
          />
          <RawBlockMenu
            v-if="button.name === 'rawBlock' && visible"
            :editor="editor"
            :sortable="true"
            @click="collapse"
          />
        </template>
      </ExpandableButtonsSet>
    </Teleport>
    <BreadCrumb
      v-if="editor"
      :editor="editor"
      :current-nodes-with-pos="currentNodesWithPos"
      @edit-node-or-mark-attributes="editNodeOrMarkAttributes"
    />
  </div>
</template>

<script setup lang="ts">
import { SK } from '../common';
import { setupQuasarIcons } from './helpers';
import { tfb } from '../i18n';
setupQuasarIcons();
</script>

<script lang="ts">
import { defineAsyncComponent } from 'vue';
import type { Node, Mark } from '@tiptap/pm/model';
import { MarkRange, NodeWithPos } from '@tiptap/vue-3';
import BreadCrumb from './BreadCrumb.vue';
import ChooseConfigButton from './ChooseConfigButton.vue';
import CustomWrapperMenu from './CustomWrapperMenu.vue';
import ElementSelectionButton from './ElementSelectionButton.vue';
import GlobalProceduresDialog from './GlobalProceduresDialog.vue';
import ImageButton from './ImageButton.vue';
import InsertDocumentButton from './InsertDocumentButton.vue';
import IndicesButtons from './IndicesButtons.vue';
import InsertNoteButton from './InsertNoteButton.vue';
import NewDocumentButton from './NewDocumentButton.vue';
import RawInlineButton from './RawInlineButton.vue';
import RawBlockMenu from './RawBlockMenu.vue';
import OutputRenderersButton from './OutputRenderersButton.vue';
import SaveButton from './SaveButton.vue';
import ExpandableButtonsSet from './ExpandableButtonsSet.vue';
import ToolbarButton from './ToolbarButton.vue';
import WholeDocTransformsButton from './WholeDocTransformsButton.vue';
import { TypeOrNode } from '../schema/extensions/HelperCommandsExtension';
import {
  COLOR_SAVED_ONLY_AS_COPY,
  COLOR_UNSAVED,
  ConfigurationSummary,
  CustomStyleInstance,
  OutputConverter,
  MARK_NAME_SPAN,
  NODE_NAME_FIGURE,
  NODE_NAME_FIGURE_CAPTION,
  NODE_NAME_PARAGRAPH,
  getPundokVersion,
} from '../common';
import { useActions, useBackend } from '../stores';
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
import { mapState } from 'pinia';
import {
  EditorGUIPropsClass,
  getEditorGuiProps,
  getTextMarkRangesBetween,
  iconFor,
} from '../schema/helpers';
import ExportProgress from './ExportProgress.vue';
import OpenButton from './OpenButton.vue';
import { showDocStateDialog } from './helpers';
// import { SK } from '../common'

const CodemirrorButton = defineAsyncComponent(
  () => import('./CodemirrorButton.vue'),
);
const CharsTableButton = defineAsyncComponent(
  () => import('./CharsTableButton.vue'),
);
const TableTools = defineAsyncComponent(() => import('./TableTools.vue'));
const inlineButtonDefinitions = [
  { name: 'removeMarks', visible: true },
  { name: 'emph', visible: true },
  { name: 'strong', visible: true },
  { name: 'underline', visible: false },
  { name: 'strikeout', visible: false },
  { name: 'superscript', visible: false },
  { name: 'subscript', visible: false },
  { name: 'smallcaps', visible: false },
  { name: 'singleQuoted', visible: false },
  { name: 'doubleQuoted', visible: false },
  { name: 'code', visible: false },
  { name: 'link', visible: false },
  { name: 'cite', visible: false },
  { name: 'math', visible: false },
  { name: 'lowercase', visible: false },
  { name: 'uppercase', visible: false },
  { name: 'uppercasefirst', visible: false },
  { name: 'image', visible: false },
  { name: 'insertNote', visible: false },
  { name: 'rawInline', visible: false },
];
const blockButtonDefinitions = [
  { name: 'togglePlain', visible: true },
  { name: 'div', visible: true, separatorAfter: true },
  { name: 'figure', visible: false },
  { name: 'caption', visible: false },
  { name: 'blockquote', visible: false },
  { name: 'bulletlist', visible: false },
  { name: 'orderedlist', visible: false, separatorAfter: true },
  { name: 'tableTools', visible: false, separatorAfter: true },
  { name: 'horizontalRule', visible: false },
  { name: 'rawBlock', visible: false },
];
export default {
  components: {
    BreadCrumb,
    CharsTableButton,
    ChooseConfigButton,
    CodemirrorButton,
    CustomWrapperMenu,
    ElementSelectionButton,
    ExportProgress,
    GlobalProceduresDialog,
    ImageButton,
    InsertDocumentButton,
    IndicesButtons,
    InsertNoteButton,
    NewDocumentButton,
    OpenButton,
    RawBlockMenu,
    RawInlineButton,
    OutputRenderersButton,
    SaveButton,
    ExpandableButtonsSet,
    TableTools,
    ToolbarButton,
    WholeDocTransformsButton,
  },
  props: [
    'editor',
    'currentNodesWithPos',
    'savedChanges',
    'savedChangesAsCopy',
    'documentLoading',
    'documentMenuRefreshKey',
    'renderingTargets',
    'transformationLog',
    'transformationFailed',
  ],
  emits: [
    'openDocument',
    // 'saveContent',
    // 'exportAgain',
    'showConfigurationsDialog',
    'showConfigurationEditor',
    'initializeGitProject',
    'manageGitProject',
    'checkGitUpdates',
    'shareGitProject',
    'connectGitProject',
    'cloneGitProject',
    'toggleSearchAndReplaceDialog',
    'editNodeOrMarkAttributes',
    'reloadWithConfiguration',
    'render-output',
    'stop-rendering',
  ],
  data() {
    return {
      version: getPundokVersion(),
      configSummaries: [] as ConfigurationSummary[],
      globalProceduresDialogVisible: false,
      gitManaged: true,
      blockButtonsInThirdRow: false,
      blockButtonsRequiredWidth: 0,
      blockButtonsResizeObserver: null as ResizeObserver | null,
      inlineButtonDefinitions,
      blockButtonDefinitions,
      // actions: useActions(),
    };
  },
  watch: {
    editor: {
      handler() {
        this.$nextTick(() => this.observeSecondRow());
      },
      immediate: true,
    },
    project: {
      handler() {
        void this.refreshGitStatus();
      },
      immediate: true,
    },
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    ...mapState(useActions, ['remoteWorkInProgress']),
    gui() {
      return getEditorGuiProps(this.editor) || new EditorGUIPropsClass();
    },
    editorKey() {
      return editorKeyFromState(this.editor.state);
    },
    swapBlocksActive() {
      return getEditorGuiProps(this.editor)?.swapBlocksActive || false;
    },
    configuration() {
      return getEditorConfiguration(this.editor);
    },
    project() {
      return getEditorProject(this.editor);
    },
    savedColor(): string | undefined {
      const savedAsCopy = this.savedChangesAsCopy;
      const saved = this.savedChanges;
      if (savedAsCopy && !saved) return COLOR_SAVED_ONLY_AS_COPY;
      else if (!(savedAsCopy || saved)) return COLOR_UNSAVED;
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
    this.$nextTick(() => this.observeSecondRow());
  },
  beforeUnmount() {
    this.blockButtonsResizeObserver?.disconnect();
  },
  methods: {
    observeSecondRow() {
      const row = this.$refs.secondRow as HTMLElement | undefined;
      if (!row || typeof ResizeObserver === 'undefined') return;

      this.blockButtonsResizeObserver?.disconnect();
      this.blockButtonsResizeObserver = new ResizeObserver(() => {
        this.updateBlockButtonsRow();
      });
      this.blockButtonsResizeObserver.observe(row);
      const buttonSetsContainer = this.$refs.buttonSetsContainer as
        HTMLElement | undefined;
      if (buttonSetsContainer) {
        this.blockButtonsResizeObserver.observe(buttonSetsContainer);
      }
      this.updateBlockButtonsRow();
    },
    updateBlockButtonsRow() {
      const row = this.$refs.secondRow as HTMLElement | undefined;
      const buttonSetsContainer = this.$refs.buttonSetsContainer as
        HTMLElement | undefined;
      if (!row || !buttonSetsContainer) return;

      if (!this.blockButtonsInThirdRow) {
        if (
          row.scrollWidth > row.clientWidth + 1 ||
          buttonSetsContainer.scrollWidth > buttonSetsContainer.clientWidth + 1
        ) {
          this.blockButtonsRequiredWidth = buttonSetsContainer.scrollWidth;
          this.blockButtonsInThirdRow = true;
        }
      } else if (
        buttonSetsContainer.clientWidth >= this.blockButtonsRequiredWidth
      ) {
        this.blockButtonsInThirdRow = false;
      }
    },
    async refreshGitStatus() {
      const path = this.project?.path;
      if (!path || !this.backend) {
        this.gitManaged = true;
        return;
      }
      try {
        this.gitManaged = (await this.backend.gitProjectStatus(path)).managed;
      } catch (error) {
        console.error('Unable to determine Git project status', error);
        this.gitManaged = true;
      }
    },
    stopRendering(converterName: string, path?: string) {
      this.$emit('stop-rendering', converterName, path);
    },
    isActive(name: string, attrs?: Record<string, any>) {
      return this.editor && this.editor.isActive(name, attrs);
    },
    iconFor(typename: string) {
      return iconFor(typename);
    },
    toggleLabelForMark(markname: string) {
      return this.$t('toggle', {
        what: tfb('marks.title.' + markname, markname),
      });
    },
    toggleLabelForNode(nodename: string) {
      return this.$t('toggle', {
        what: tfb('nodes.title.' + nodename, nodename),
      });
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
    insertNoteAndCollapse(noteType: string, collapse: () => void) {
      this.insertNote(noteType);
      collapse();
    },
    inFigure() {
      return (this.currentNodesWithPos as NodeWithPos[]).find(
        (n) => n.node.type.name === NODE_NAME_FIGURE,
      );
    },
    showProjectStructure() {
      setActionShowProjectStructureDialog(this.editor.state);
    },
    showConfigurationEditor() {
      this.$emit('showConfigurationEditor');
    },
    repeatCommandTitle() {
      return currentRepeatableCommandTooltip(this.editor.state);
    },
    reloadWithConfiguration(configurationName: string) {
      this.$emit('reloadWithConfiguration', configurationName);
    },
    swapBlocksToggleTooltip() {
      return this.$t('clickTo.moveOrSwapVertically', {
        state: this.$t(this.swapBlocksActive ? 'enabled' : 'disabled'),
        shortcut: `${SK.MOVE_NODE_UP}/${SK.MOVE_NODE_DOWN}`,
      });
    },
    async debug() {
      showDocStateDialog(this.editor);
    },
    renderOutput(converter: OutputConverter, path?: string) {
      this.$emit('render-output', converter, path);
    },
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

.menubar-second-row {
  flex-wrap: nowrap;
  overflow: hidden;
}

.button-sets-container {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  gap: 0.3rem;
  overflow: hidden;
}

.block-buttons-target {
  flex: 0 0 auto;
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

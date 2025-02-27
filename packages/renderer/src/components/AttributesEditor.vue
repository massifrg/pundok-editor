<template>
  <q-dialog v-model="isActive" @show="show" @hide="hide"
    :full-height="hasContentVirtualAttr && tab === contentVirtualAttrName">
    <q-card style="min-height: 20%; min-width: 50%">
      <q-bar>
        <q-icon :name="nodeOrMarkIcon" />
        <div>{{ nodeOrMarkLabel }}</div>
        <q-space />
        <q-btn dense flat icon="mdi-close" @click="doCancel()">
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>
      <q-tabs v-model="tab" dense class="text-grey" active-color="primary" indicator-color="primary" align="justify"
        narrow-indicator>
        <q-tab v-for="tabName in editorTabs" :key="tabName" :name="tabName" :label="labelForTab(tabName)"
          :alert="isAttributeModifiedInTab(tabName)" />
      </q-tabs>
      <q-separator />
      <q-tab-panels v-model="tab" animated>
        <q-tab-panel v-if="hasAttribute('level')" name="level">
          <LevelEditor :editor="editor" :start-value="attrs.level" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset level" size="xs" @click="resetAttribute('level')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('id')" name="id">
          <TextAttrEditor :start-value="attrs.id" attr-name="id" @update-attribute="updateAttribute" enter-commits
            @commit="doChange" />
          <q-card v-if="isIndexTerm" class="q-my-xs">
            <IndexIdEditor class="q-my-xs" :editor="editor" attr-name="id" :start-value="attrs.id"
              :index-name="indexName" :sources="indexSources()" :starting-search-text="searchText"
              search-every-word="true" :starting-search-text-variant="searchTextVariant"
              @change-search-text-variant="changeSearchTextVariant" @update-attribute="updateAttribute"
              @commit="doChange" />
          </q-card>
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset id" size="xs" @click="resetAttribute('id')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('classes')" name="classes">
          <ClassesEditor :editor="editor" :node-or-mark="nodeOrMark" :start-value="attrs.classes"
            :important-classes="importantClasses" @update-attribute="updateAttribute" @add-class="addClass"
            @remove-class="removeClass" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset classes" size="xs" @click="resetAttribute('classes')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('kv')" name="kv">
          <OtherAttributesEditor :editor="editor" :node-or-mark="nodeOrMark" attr-name="kv"
            :original-entries="objectEntries('kv', originalAttrs)" :initial-entries="objectEntries('kv', attrs)"
            :classes="attrs.classes || []" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset other attributes" size="xs" @click="resetAttribute('kv')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('customStyle')" name="customStyle">
          <CustomStyleEditor :editor="editor" :original-value="attrs.customStyle" :type="nodeOrMarkName"
            :level="nodeOrMark?.attrs?.level" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset custom style" size="xs" @click="resetAttribute('customStyle')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('noteType')" name="noteType">
          <NoteTypeEditor :editor="editor" :original-value="attrs.noteType" :type="nodeOrMarkName"
            @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset note type" size="xs" @click="resetAttribute('noteType')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('headRows')" name="headRows">
          <IntegerEditor :editor="editor" attr-name="headRows" :start-value="attrs.headRows" :min-value="0 + 0"
            :max-value="rowsOfTableBody" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset headRows" size="xs" @click="resetAttribute('headRows')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('rowHeadColumns')" name="rowHeadColumns">
          <IntegerEditor :editor="editor" attr-name="rowHeadColumns" :start-value="attrs.rowHeadColumns"
            :min-value="0 + 0" :max-value="columnsOfTableBody" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset rowHeadColumns" size="xs" @click="resetAttribute('rowHeadColumns')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('sort-key')" name="sort-key">
          <TextAttrEditor :start-value="attrs.kv['sort-key']" attr-name="sort-key" @update-attribute="updateKvAttribute"
            enter-commits @commit="doChange" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset sort key for this term" size="xs"
              @click="resetAttribute('sortKey')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('ref-class')" name="ref-class">
          <TextAttrEditor :start-value="attrs.kv['ref-class']" attr-name="ref-class" enter-commits
            @update-attribute="updateKvAttribute" @commit="doChange" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset class for references" size="xs" @click="resetAttribute('refClass')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('put-index-ref')" name="put-index-ref">
          <SelectValueEditor :start-value="attrs.putIndexRef" attr-name="put-index-ref" :options="[
            { label: 'before', value: 'before' },
            { label: 'after', value: 'after' }
          ]" @update-attribute="updateKvAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset index ref placement" size="xs"
              @click="resetAttribute('putIndexRef')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('text') && !isRawElement" name="text">
          <TextAttrEditor :start-value="attrs.text" attr-name="text" @update-attribute="updateAttribute"
            @commit="doChange" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset id" size="xs" @click="resetAttribute('text')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('text') && isRawElement" name="text">
          <div style="background-color: black">
            <RawTextEditor :start-value="attrs.text" :format="attrs.format" :is-block="isRawBlock"
              @update-attribute="updateAttribute" @cancel="doCancel" @commit="doChange" />
          </div>
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset id" size="xs" @click="resetAttribute('text')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('format') && isRawElement" name="format">
          <q-card-actions align="center">
            <q-btn :label="attrs.format">
              <!-- <q-menu anchor="bottom middle" self="top middle"> -->
              <q-menu cover anchor="center middle">
                <q-list dense>
                  <q-item v-for="rf in rawFormats()" clickable v-close-popup @click="updateAttribute('format', rf.name)"
                    style="min-width: 400px">
                    <q-item-section side><q-icon :name="rf.icon" /></q-item-section>
                    <q-item-section side>{{ rf.name }}</q-item-section>
                    <q-item-section>{{ rf.description }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-actions>
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset format" size="xs" @click="resetAttribute('format')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('language') && isCode" name="language">
          <q-card-actions align="center">
            <q-btn :label="attrs.language">
              <!-- <q-menu anchor="bottom middle" self="top middle"> -->
              <q-menu cover anchor="center middle">
                <q-list dense>
                  <q-item v-for="lang in codeLanguages()" clickable v-close-popup
                    @click="updateAttribute('language', lang.name)" style="min-width: 400px">
                    <q-item-section side><q-icon :name="lang.icon" /></q-item-section>
                    <q-item-section side>{{ lang.name }}</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-actions>
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset format" size="xs" @click="resetAttribute('format')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-for="a in cellSpanAttributes" :name="a">
          <IntegerEditor :attr-name="a" :min-value="1" :max-value="30" :start-value="originalAttrs[a]"
            @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" :title="`reset ${a}`" size="xs" @click="resetAttribute(a)" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="isIndexRef" name="idref">
          <IndexRefEditor :editor="editor" :node-or-mark="nodeOrMark"
            :original-entries="objectEntries('kv', originalAttrs)" :initial-entries="objectEntries('kv', attrs)"
            @update-attribute="updateAttribute" @commit="doChange" />
          <q-toggle v-model="optionPropagateIdref" label="propagate idref to the refs with the same indexed text" />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset idref" size="xs" @click="resetKvAttribute('idref')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute(indexNameAttr())" :name="indexNameAttr()">
          <IndexNameEditor :indices-names="availableIndicesNames"
            :start-value="attrs.kv[indexNameAttr()] || availableIndicesNames[0]"
            @update-attribute="updateKvAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" :title="`reset ${indexNameAttr()}`" size="xs"
              @click="resetAttribute('indexName')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasAttribute('mathType')" name="mathType">
          <SelectValueEditor :start-value="attrs.mathType" attr-name="mathType" :options="[
            { label: 'InlineMath', value: 'InlineMath' },
            { label: 'DisplayMath', value: 'DisplayMath' }
          ]" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset MathType" size="xs" @click="resetAttribute('mathType')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="isImage || isLink" name="target">
          <TargetEditor :editor="editor" :node-or-mark="nodeOrMark" :url-attr-name="isImage ? 'src' : 'href'"
            :url="isImage ? attrs.src : attrs.href" :title="attrs.title" @update-attribute="updateAttribute" />
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset target" size="xs" @click="resetAttribute('target')" />
          </q-card-actions>
        </q-tab-panel>
        <q-tab-panel v-if="hasContentVirtualAttr" :name="contentVirtualAttrName">
          <div style="background-color: black">
            <RawTextEditor :start-value="contentVirtualAttrValue" :format="contentVirtualAttrFormat" :is-block="true"
              @update-attribute="updateContent" @cancel="doCancel" @commit="doChange" />
          </div>
          <q-space />
          <q-card-actions align="center">
            <q-btn icon="mdi-reload" title="reset id" size="xs" @click="resetAttribute('text')" />
          </q-card-actions>
        </q-tab-panel>
      </q-tab-panels>
      <q-card-actions>
        <q-btn v-if="!noAttrModified" color="primary" title="reset all attributes" @click="resetAllAttributes()">
          <q-icon name="mdi-reload" />
        </q-btn>
        <q-space />
        <q-btn label="Change" color="primary" @click="doChange()" />
        <q-btn label="Cancel" color="primary" @click="doCancel()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { isEmpty, isEqual } from 'lodash';
import { Mark, Node } from '@tiptap/pm/model';
import { useQuasar } from 'quasar';
import { mdiChevronLeft, mdiChevronRight } from '@quasar/extras/mdi-v6/index.js'
import {
  PANDOC_OUTPUT_FORMATS,
  editableAttrsForNodeOrMark,
  importantClasses,
  matchingDuplicatedAttribute
} from '../schema/helpers/attributes';
import { type SelectedNodeOrMark } from '../schema/helpers/selection';
import LevelEditor from './attreditors/LevelEditor.vue';
import TextAttrEditor from './attreditors/TextAttrEditor.vue';
import ClassesEditor from './attreditors/ClassesEditor.vue';
import OtherAttributesEditor from './attreditors/OtherAttributesEditor.vue'
import IntegerEditor from './attreditors/IntegerEditor.vue';
import CustomStyleEditor from './attreditors/CustomStyleEditor.vue';
import NoteTypeEditor from './attreditors/NoteTypeEditor.vue';
import SelectValueEditor from './attreditors/SelectValueEditor.vue';
import RawTextEditor from './attreditors/RawTextEditor.vue';
import IndexRefEditor from './attreditors/IndexRefEditor.vue';
import IndexNameEditor from './attreditors/IndexNameEditor.vue';
import IndexIdEditor, { SearchTextVariant } from './attreditors/IndexIdEditor.vue';
import TargetEditor from './attreditors/TargetEditor.vue';
import {
  INCLUDE_DOC_CLASS,
  INCLUDE_FORMAT_ATTR,
  INCLUDE_SRC_ATTR,
  getDocState,
  getEditorConfiguration
} from '../schema';
import {
  DEFAULT_INDEX_NAME,
  INDEX_NAME_ATTR,
  Index,
  IndexSource,
  MARK_NAME_CODE,
  MARK_NAME_LINK,
  NODE_NAME_CODE_BLOCK,
  NODE_NAME_DIV,
  NODE_NAME_IMAGE,
  NODE_NAME_INDEX_REF,
  NODE_NAME_INDEX_TERM,
  NODE_NAME_RAW_BLOCK,
  NODE_NAME_RAW_INLINE,
  NODE_NAME_TABLE_BODY
} from '../common';
import { useBackend } from '../stores';
import { mapState } from 'pinia';
import {
  editableAttrsWithTab,
  getAttrsChange,
  markIcon,
  nodeIcon,
  nodeOrMarkToPandocName
} from '../schema/helpers';
import { toRaw } from 'vue';
import { createLowlight, all } from 'lowlight';
import { ACTION_ADD_CLASS, BaseActionForNodeOrMark } from '../actions';

const lowlight = createLowlight(all);

const myIcons: Record<string, string> = {
  chevron_left: mdiChevronLeft,
  chevron_right: mdiChevronRight,
}

const TARGET_ATTRS = ['src', 'href', 'title']
const TEXT_CONTENT_TAB = 'content'

export default {
  components: {
    LevelEditor,
    TextAttrEditor,
    ClassesEditor,
    OtherAttributesEditor,
    IntegerEditor,
    CustomStyleEditor,
    NoteTypeEditor,
    SelectValueEditor,
    RawTextEditor,
    IndexRefEditor,
    IndexNameEditor,
    IndexIdEditor,
    TargetEditor,
  },
  setup() {
    const $q = useQuasar()
    $q.iconMapFn = (iconName) => {
      const icon = myIcons[iconName]
      if (icon !== void 0) {
        return { icon: icon }
      }
    }
  },
  props: ['editor', 'selectedNodeOrMark', 'startTab', 'onAttributesEditorShow'],
  emits: ['closeAttributesEditor'],
  data() {
    return {
      tab: this.startTab || '',
      originalAttrs: {} as Record<string, any>,
      attrs: {} as Record<string, any>,
      originalTextContent: undefined as string | undefined,
      textContent: undefined as string | undefined,
      optionPropagateIdref: false,
      searchTextVariant: 'first-3-words' as SearchTextVariant,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    indices(): Index[] {
      return this.configuration?.indices || []
    },
    nodeOrMark(): Node | Mark | undefined {
      return this.selectedNodeOrMark?.node || this.selectedNodeOrMark?.mark;
    },
    isActive() {
      // console.log(this.nodeOrMark);
      return !!this.nodeOrMark;
    },
    nodeOrMarkName() {
      if (this.nodeOrMark) {
        return this.nodeOrMark.type.name;
      }
      return 'Node or a Mark';
    },
    nodeOrMarkIcon() {
      return this.nodeOrMark instanceof Mark
        ? markIcon(this.nodeOrMark)
        : nodeIcon(this.nodeOrMark?.type.name)
    },
    nodeOrMarkLabel() {
      return this.nodeOrMark
        ? nodeOrMarkToPandocName(this.nodeOrMark, {})
        : this.nodeOrMarkName
    },
    isIndexTerm() {
      return this.nodeOrMarkName === NODE_NAME_INDEX_TERM
    },
    isIndexRef() {
      return this.nodeOrMarkName === NODE_NAME_INDEX_REF
    },
    indexName() {
      return this.nodeOrMark?.attrs?.kv[INDEX_NAME_ATTR]
    },
    isImage() {
      return this.nodeOrMarkName === NODE_NAME_IMAGE
    },
    isLink() {
      return this.nodeOrMarkName === MARK_NAME_LINK
    },
    isRawElement() {
      const typeName = this.nodeOrMark?.type.name
      return typeName === NODE_NAME_RAW_INLINE || typeName === NODE_NAME_RAW_BLOCK
    },
    isRawBlock() {
      return this.nodeOrMark?.type.name === NODE_NAME_RAW_BLOCK
    },
    isCode() {
      const typeName = this.nodeOrMark?.type.name
      return typeName === NODE_NAME_CODE_BLOCK || typeName === MARK_NAME_CODE
    },
    isCodeBlock() {
      return this.nodeOrMark?.type.name === NODE_NAME_CODE_BLOCK
    },
    editableAttributes(): string[] {
      return editableAttrsForNodeOrMark(this.nodeOrMark)
    },
    /** you can edit RawBlock and CodeBlock content in the attributes editor  */
    hasContentVirtualAttr() {
      return this.isRawBlock || this.isCodeBlock
    },
    /** name of the virtual attribute that represents the content of a RawBlock or a CodeBlock */
    contentVirtualAttrName() {
      return this.hasContentVirtualAttr ? TEXT_CONTENT_TAB : undefined
    },
    /** the content of a RawBlock or a CodeBlock */
    contentVirtualAttrValue() {
      return this.hasContentVirtualAttr ? (this.nodeOrMark as Node).textContent : undefined
    },
    /** the format of a RawBlock or the language of a CodeBlock */
    contentVirtualAttrFormat() {
      if (this.isRawBlock)
        return this.attrs.format
      else if (this.isCodeBlock)
        return this.attrs.language
      return undefined
    },
    isTextContentChanged(): boolean {
      return toRaw(this.textContent) !== toRaw(this.originalTextContent)
    },
    editorTabs(): string[] {
      const tabNames = editableAttrsWithTab(this.nodeOrMark)
      if (this.isIndexRef && tabNames.indexOf('idref') < 0)
        tabNames.push('idref')
      if (this.isImage || this.isLink)
        tabNames.push('target')
      if (this.hasContentVirtualAttr)
        tabNames.push(TEXT_CONTENT_TAB)
      return tabNames || []
    },
    importantClasses(): string[] {
      return importantClasses(this.nodeOrMark);
    },
    noAttrModified() {
      return isEmpty(this.updatedAttrs())
    },
    cellSpanAttributes(): string[] {
      return this.editableAttributes.filter(ea => ea === 'colspan' || ea === 'rowspan')
    },
    rowsOfTableBody() {
      const sel = this.selectedNodeOrMark as SelectedNodeOrMark
      const rows = sel.name == NODE_NAME_TABLE_BODY ? sel.node?.childCount || 0 : 0
      return rows
    },
    columnsOfTableBody() {
      const sel = this.selectedNodeOrMark as SelectedNodeOrMark
      if (sel.name != NODE_NAME_TABLE_BODY) return 0
      let cols = 0
      const firstRow = sel.node?.firstChild
      if (firstRow) {
        for (let i = 0; i < firstRow.childCount; i++) {
          cols += firstRow.child(i).attrs.colspan || 1
        }
      }
      return cols
    },
    availableIndicesNames() {
      const names = this.indices.map(i => i.indexName)
      return names.length > 0 ? names : [DEFAULT_INDEX_NAME]
    },
    searchText(): string {
      const content = (this.nodeOrMark as Node).textContent || ''
      let words = content.split(/\P{Letter}+/u)
        .filter(t => t.length > 0)
      switch (this.searchTextVariant) {
        case 'first-2-words':
          words = words.slice(0, 2)
          break
        case 'first-3-words':
          words = words.slice(0, 3)
          break
      }
      return words.join(' ')
    },
  },
  watch: {
    nodeOrMark(newValue) {
      if (newValue) {
        const ee = Object.entries(this.nodeOrMark?.attrs || {});
        this.originalAttrs = Object.fromEntries(ee);
        this.attrs = Object.fromEntries(ee);
        this.setTab()
        // const names = [this.startTab, ...this.editableAttributes]
        const action = this.onAttributesEditorShow as BaseActionForNodeOrMark | undefined
        if (action?.name === ACTION_ADD_CLASS.name) {
          const class_to_add = action.props?.class
          if (class_to_add) {
            this.addClass(class_to_add)
          }
        }
        const textContent = newValue
          && (newValue instanceof Node)
          && newValue.textContent
          || undefined
        this.textContent = textContent
        this.originalTextContent = textContent
      }
    },
    startTab(newValue) {
      this.setTab(newValue)
    }
  },
  methods: {
    show() {
      this.setTab()
    },
    hide() {
      this.tab = undefined
    },
    setTab(_tab?: string) {
      const tab = _tab || this.startTab || this.tab
      const node = this.nodeOrMark
      if (!isEmpty(tab)) {
        this.tab = tab
      } else if (node && node.type.name === NODE_NAME_INDEX_REF) {
        this.tab = 'idref'
      } else {
        const tabs = this.editorTabs
        let index
        index = tabs.indexOf('target')
        index = index >= 0 ? index : tabs.indexOf('kv')
        index = index >= 0 ? index : (tabs?.length || 1) - 1
        this.tab = tabs[index]
        console.log(`TAB=${this.tab}, index=${index}`)
      }
    },
    rawFormats(): { name: string, description: string, icon: string }[] {
      return PANDOC_OUTPUT_FORMATS.map(([name, description, icon]) => ({
        name,
        description,
        icon: icon || (this.isRawBlock ? 'code_block_tags' : 'mdi-code-tags')
      }))
    },
    codeLanguages() {
      return lowlight.listLanguages().map(name => ({ name, icon: `mdi-language-${name}` }))
    },
    indexNameAttr() {
      return INDEX_NAME_ATTR
    },
    labelForTab(attrName: string): string {
      switch (attrName) {
        case 'kv':
          return 'attributes'
        default:
          return attrName
      }
    },
    hasAttribute(attrName: string): boolean {
      return this.editableAttributes.includes(attrName);
    },
    hasAttributes(attrNames: string[]): boolean {
      return attrNames.every(an => this.hasAttribute(an));
    },
    resetAttribute(attrName: string) {
      if (attrName === 'target') {
        if (this.isImage) {
          this.resetAttribute('src')
        } else if (this.isLink) {
          this.resetAttribute('href')
        }
        this.resetAttribute('title')
      } else if (this.hasAttribute(attrName)) {
        this.updateAttribute(attrName, this.originalAttrs[attrName]);
      }
    },
    resetKvAttribute(kvAttrName: string) {
      this.updateKvAttribute(kvAttrName, this.originalAttrs.kv[kvAttrName]);
    },
    resetAllAttributes() {
      Object.keys(this.originalAttrs).forEach(attrName => {
        this.resetAttribute(attrName)
      })
    },
    modifiedAttrs() {
      return Object.keys(this.originalAttrs)
        .filter(name => !isEqual(this.originalAttrs[name], this.attrs[name]))
        .map(name => ({
          attrName: name,
          from: this.originalAttrs[name],
          to: this.attrs[name],
        }));
    },
    isAttributeModifiedInTab(tabName: string): boolean {
      if (tabName === TEXT_CONTENT_TAB)
        return this.isTextContentChanged
      const modifiedAttrs = this.modifiedAttrs()
      const modified = modifiedAttrs.find(ma => ma.attrName === tabName)
      if (modified) return true
      const kv = modifiedAttrs.find(ma => ma.attrName === 'kv')
      if (kv) {
        const from = kv.from[tabName]
        const to = kv.to[tabName]
        return !isEqual(from, to)
      }
      if (tabName === 'target')
        return !!modifiedAttrs.find(ma => TARGET_ATTRS.indexOf(ma.attrName) >= 0)
      return false
    },
    updatedAttrs() {
      return Object.fromEntries(this.modifiedAttrs().map(e => [e.attrName, e.to]));
    },
    async setIncludedDocAttrs() {
      const docState = getDocState(this.editor.state)
      // console.log(docState)
      const coords = await this.backend?.askForDocumentIdOrPath('inclusion', {
        editorKey: docState?.editorKey,
        project: docState?.project,
      })
      if (coords) {
        // console.log(coords)
        const { format, id, src } = coords
        if (format) this.updateKvAttribute(INCLUDE_FORMAT_ATTR, format)
        if (src) this.updateKvAttribute(INCLUDE_SRC_ATTR, src)
        if (id) {
          // this.updateKvAttribute(INCLUDE_ID_ATTR, id)
          this.updateAttribute('id', id)
        }
      } else {
        this.removeClass(INCLUDE_DOC_CLASS)
      }
    },
    doChange() {
      const snom: SelectedNodeOrMark = this.selectedNodeOrMark as SelectedNodeOrMark;
      if (snom.pos >= 0 && snom.node) {
        const { name, pos } = snom
        // const { classes } = this.attrs || []
        const repeatableChange = getAttrsChange(snom.node, toRaw(this.attrs), toRaw(this.originalAttrs))
        // console.log(repeatableChange)
        if (snom.name === NODE_NAME_TABLE_BODY) {
          this.editor?.chain()
            .setNodeSelection(pos)
            .setAttrsChange(repeatableChange)
            .updateNodeAttributesAtPos(name, this.attrs, pos)
            .fixPandocTables()
            .run();
        } else if (this.hasContentVirtualAttr && this.isTextContentChanged) {
          this.editor?.chain()
            .setNodeSelection(pos)
            .setTextContent(this.textContent, pos)
            .setAttrsChange(repeatableChange)
            .updateNodeAttributesAtPos(name, this.attrs, pos)
            // .setNodeSelection(pos)
            // .fixNodeAtPos(pos, { ...this.indices })
            .scrollIntoView()
            .focus()
            .run();
        } else {
          this.editor?.chain()
            .setNodeSelection(pos)
            .setAttrsChange(repeatableChange)
            .updateNodeAttributesAtPos(name, this.attrs, pos)
            // .setNodeSelection(pos)
            .fixNodeAtPos(pos, { ...this.indices })
            .scrollIntoView()
            .focus()
            .run();
        }
      } else if (snom.mark && snom.from && snom.to) {
        // if (snom.name === MARK_NAME_SPAN) {
        const repeatableChange = getAttrsChange(snom.mark, toRaw(this.attrs), toRaw(this.originalAttrs))
        // console.log(repeatableChange)
        this.editor.chain()
          .setAttrsChange(repeatableChange)
          .setTextSelection({ from: snom.from, to: snom.to })
          .updateMarkAttributes(snom.name, this.attrs)
          .run();
        // } else {
        //   this.editor?.chain()
        //     .setTextSelection({ from: snom.from, to: snom.to })
        //     .updateAttributes(snom.mark.type, this.updatedAttrs())
        //     .run();
        // }
      }
      if (snom.name === NODE_NAME_INDEX_REF && this.optionPropagateIdref) {
        const editor = this.editor
        if (editor) {
          const indexRef = editor.state.doc.nodeAt(snom.pos)
          if (indexRef) this.editor?.commands.propagateIdref(indexRef)
        }
      }
      this.$emit('closeAttributesEditor');
    },
    doCancel() {
      this.$emit('closeAttributesEditor');
    },
    updateAttribute(attrName: string, newValue: any) {
      if (attrName === 'classes') return
      if (this.hasAttribute(attrName)) {
        console.log(`updateAttribute: ${attrName}=${JSON.stringify(newValue)}`);
        this.attrs[attrName] = newValue;
        const matchingAttr = matchingDuplicatedAttribute(this.nodeOrMark, attrName)
        if (matchingAttr && this.attrs.kv && this.attrs.kv[matchingAttr] !== newValue)
          this.updateKvAttribute(matchingAttr, newValue)
      }
    },
    updateContent(_: string, value: string) {
      // console.log(`updateContent: ${value}`)
      this.textContent = value
    },
    async addClass(ac: string) {
      console.log(`addClass: ${ac}`);
      const classes = this.attrs.classes || []
      if (!classes.includes(ac)) {
        if (ac === INCLUDE_DOC_CLASS && this.nodeOrMarkName === NODE_NAME_DIV)
          this.setIncludedDocAttrs()
        this.attrs.classes = [...classes, ac]
      }
    },
    removeClass(rc: string) {
      console.log(`removeClass: ${rc}`);
      this.attrs.classes = (this.attrs.classes as string[]).filter(c => c !== rc)
    },
    updateKvAttribute(kvAttrName: string, newValue: any) {
      const kv = { ...this.attrs.kv }
      const matchingAttr = matchingDuplicatedAttribute(this.nodeOrMark, kvAttrName)
      if (newValue) {
        console.log(`updateKvAttribute: ${kvAttrName}=${JSON.stringify(newValue)}`);
        kv[kvAttrName] = newValue
        if (matchingAttr && this.attrs[matchingAttr] != newValue)
          this.updateAttribute(matchingAttr, newValue)
      } else {
        if (!matchingAttr) {
          console.log(`updateKvAttribute: delete ${kvAttrName}`);
          delete kv[kvAttrName]
        }
      }
      this.updateAttribute('kv', kv)
    },
    objectEntries(attrName: string, obj: Record<string, any>) {
      if (this.hasAttribute(attrName)) {
        return Object.entries(obj[attrName] || {}).map(([key, value]) => ({ key, value }))
      }
      return []
    },
    indexSources(): IndexSource[] {
      return [{
        type: 'json-file',
        filename: (this.indexNameAttr() || 'index') + '.json'
      }]
    },
    changeSearchTextVariant(variant: SearchTextVariant) {
      this.searchTextVariant = variant
    }
  },
};
</script>
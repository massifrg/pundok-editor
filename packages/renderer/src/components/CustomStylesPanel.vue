<template>
  <div class="q-pa-xs" style="max-width: 600px">
    <q-splitter v-model="splitterModel">

      <template v-slot:before>
        <q-tabs v-model="tab" vertical fit>
          <q-tab name="summary" title="custom styles summary at cursor">
            <q-icon name="mdi-table-of-contents" size="sm" round @mouseover="tab = 'summary'">
              <q-badge v-if="summary.find(s => s.type === 'style')" color="primary" floating rounded />
            </q-icon>
          </q-tab>

          <q-tab v-for="(b, i) in outerBlocks" :name="`outer_${i}`" :title="`custom classes for ${blockName(b.node)}`"
            @mouseover="tab = `outer_${i}`">
            <q-icon :name="iconForNode(b.node)" size="sm" round>
              <q-badge v-if="stylesOfBlocks[i].length > 0" color="primary" floating rounded />
            </q-icon>
          </q-tab>

          <q-tab name="header" v-if="innerParaLike" title="custom header styles (classes)" :disable="!innerParaLike">
            <q-icon name="mdi-format-header-pound" size="sm" round @mouseover="tab = 'header'">
              <q-badge v-if="isHeader && !isHeaderWithoutStyles()" color="primary" floating rounded />
            </q-icon>
          </q-tab>
          <q-tab name="para" v-if="innerParaLike" title="custom paragraph styles" :disable="!innerParaLike">
            <q-icon name="paragraph_style" size="sm" round @mouseover="tab = 'para'">
              <q-badge v-if="isParagraph && !isParaWithoutStyles()" color="primary" floating rounded />
            </q-icon>
          </q-tab>
          <q-tab name="char">
            <q-icon name="character_style" size="sm" round @mouseover="tab = 'char'">
              <q-badge v-if="activeCharStyles.length > 0" color="primary" floating rounded />
            </q-icon>
          </q-tab>
          <!-- 
          <q-tab name="cell" disable>
            <q-icon name="mdi-table" size="sm" round @mouseover="tab = 'cell'">
              <q-badge v-if="!isParaWithoutStyles()" color="primary" floating rounded />
            </q-icon>
          </q-tab>
           -->
        </q-tabs>
      </template>

      <template v-slot:after>
        <q-tab-panels v-model="tab" swipeable vertical>
          <q-tab-panel name="summary" class="q-pa-none">
            <q-list v-for="{ type, label, icon } in summary" dense>
              <q-separator v-if="type === 'node'" />
              <q-item :class="type === 'node' ? 'text-weight-bold' : ''">
                <q-item-section side :class="type === 'style' ? 'q-pl-lg' : ''">
                  <q-icon v-if="type === 'node'" :name="icon" size="sm" />
                  <q-icon v-if="type === 'style'" :name="icon" size="xs" />
                  <!-- <q-icon v-if="type === 'char'" :name="icon" size="xs" /> -->
                </q-item-section>
                <q-item-section>{{ label }}</q-item-section>
              </q-item>
            </q-list>
            <q-separator />
          </q-tab-panel>

          <q-tab-panel v-for="(b, i) in outerBlocks" :name="`outer_${i}`">
            <q-list v-if="innerParaLike" dense>
              <q-item class="text-caption text-weight-bold q-pa-xs">Styles</q-item>
              <q-item v-for="(cs, index) in availableStylesForNode(b.node)" :key="index" clickable density="compact"
                :value="index" :title="cs.styleDef.description" class="q-pa-xs" @click="toggleStyle(cs, b.node, b.pos)">
                <q-item-section side>
                  <q-icon :name="isCustomStyleActive(cs, b.node) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap v-html="cs.styleDef.name" />
              </q-item>
              <q-separator />
              <q-item class="text-caption text-weight-bold q-pa-xs">Classes:</q-item>
              <q-item v-for="(cc, index) in customClassesFor(b.node)" :key="index" clickable density="compact"
                :value="index" :title="cc.description" class="q-pa-xs"
                @click="editor.commands.toggleCustomClass(cc, b.pos, configuration)">
                <q-item-section side>
                  <q-icon
                    :name="isCustomClassActive(cc, b.node) ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap v-html="cc.name" />
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel v-if="innerParaLike" name="header" class="q-pa-none">
            <q-list v-if="innerParaLike" v-for="(level, index) in headingLevels" dense>
              <q-separator v-if="index !== 0" />
              <q-item :key="`h${level}-no-style`" clickable :title="`level ${level} header without custom class`" dense
                class="q-pa-xs" @click="setHeaderWithoutCustomStyles(level)">
                <q-item-section side>
                  <q-icon :name="isHeaderWithoutStyles(level) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap><span class="style-item">H{{ level
                    }}&nbsp;<i>(no&nbsp;style)</i></span></q-item-section>
              </q-item>
              <q-item v-for="(styleItem, index) in availableHeaderStylesForNode(innerParaLike, level)" :key="index"
                clickable :value="index" :title="description(styleItem)" dense class="q-pa-xs"
                @click="setCustomStyle(innerParaLike, styleItem)">
                <q-item-section side>
                  <q-icon
                    :name="isCustomStyleActive(styleItem, innerParaLike) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap v-html="styleLabel(styleItem)" />
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel v-if="innerParaLike" name="para" class="q-pa-none">
            <q-list dense>
              <q-item key="p-no-style" clickable title="normal paragraph without custom style" dense class="q-pa-xs"
                @click="setParaWithoutCustomStyles()">
                <q-item-section side>
                  <q-icon :name="isParaWithoutStyles() ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'" size="xs" />
                </q-item-section>
                <q-item-section no-wrap><span class="style-item">P&nbsp;<i>(no&nbsp;style)</i></span></q-item-section>
              </q-item>
              <q-separator />
              <q-item v-for="(styleItem, index) in availableParaStylesForNode(innerParaLike)" :key="index" clickable
                :value="index" :title="description(styleItem)" class="q-pa-xs"
                @click="setCustomStyle(innerParaLike, styleItem)">
                <q-item-section side>
                  <q-icon
                    :name="isCustomStyleActive(styleItem, innerParaLike) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap v-html="styleLabel(styleItem)" />
              </q-item>
            </q-list>
          </q-tab-panel>

          <q-tab-panel name="char" class="q-pa-none">
            <q-list dense>
              <q-item key="char-no-style" clickable title="normal text without custom style" dense class="q-pa-xs"
                @click="unsetAllCharStyles()">
                <q-item-section side>
                  <q-icon :name="activeCharStyles.length === 0 ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap><span
                    class="style-item">&nbsp;<i>(no&nbsp;char&nbsp;style)</i></span></q-item-section>
              </q-item>
              <q-separator />
              <q-item v-for="s in charStyles" clickable :value="s.styleDef.name" :title="description(s)" class="q-pa-xs"
                dense @click="toggleCharStyle(s)">
                <q-item-section side>
                  <q-icon :name="isCharStyleActive(s) ? 'mdi-checkbox-outline' : 'mdi-checkbox-blank-outline'"
                    size="xs" />
                </q-item-section>
                <q-item-section no-wrap v-html="s.styleDef.name" />
              </q-item>
            </q-list>
          </q-tab-panel>

          <!-- 
          <q-tab-panel name="cell">
          </q-tab-panel>
          -->

        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script lang="ts">
import { setupQuasarIcons } from './helpers/quasarIcons';
import { Node } from '@tiptap/pm/model';
import { MarkRange, NodeWithPos } from '@tiptap/core';
import {
  CustomClass,
  CustomStyleInstance,
  MARK_NAME_SPAN,
  NODE_NAME_HEADING,
  NODE_NAME_PARAGRAPH,
  NODE_NAME_PLAIN,
  PundokEditorConfig,
  activeCustomStyles,
  compatibleCustomStylesPerTypeName,
  customClassesForNodeOrMark,
  customStylesForType,
  isBlockOfInlines,
  // customStylesForType,
  isCustomStyleActive,
  isCustomizableElement,
  labelForStyle,
} from '../common';
import { getEditorConfiguration, Heading } from '../schema';
import { getTextMarkRangesBetween, nodeIcon, nodeOrMarkToPandocName } from '../schema/helpers';
import { isString } from 'lodash';

const STARTING_TAB = 'summary'
const MINI_SPLITTER_VALUE = 20

export default {
  props: ['editor', 'currentBlocks', 'activeCustomStyles', 'panelState'],
  emits: ['unsetCustomStyle', 'setCustomStyle'],
  setup() {
    setupQuasarIcons()
  },
  watch: {
    panelState(newState) {
      if (newState === 'mini') {
        this.splitterModel = 100
      } else {
        this.splitterModel = MINI_SPLITTER_VALUE
      }
    }
  },
  data() {
    return {
      tab: STARTING_TAB,
      splitterModel: MINI_SPLITTER_VALUE,
      headingLevels: Heading.options.levels,
    }
  },
  computed: {
    configuration() {
      const conf = getEditorConfiguration(this.editor)
      if (conf) return new PundokEditorConfig(conf) // TODO: fix this
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    availableStyles(): Record<string, CustomStyleInstance[]> {
      return compatibleCustomStylesPerTypeName(this.customStyles)
    },
    availableCustomClasses(): Record<string, CustomClass[]> {
      const ret: Record<string, CustomClass[]> = {}
      const customClasses: CustomClass[] = this.configuration?.customClasses || []
      customClasses.forEach(cc => {
        cc.appliesTo?.forEach(el => {
          if (ret[el])
            ret[el].push(cc)
          else
            ret[el] = [cc]
        })
      })
      return ret
    },
    stylableBlocks(): NodeWithPos[] {
      const stylable = (this.currentBlocks as NodeWithPos[])
        .filter(({ node }) => isCustomizableElement(node))
      // .filter(({ node }) => this.availableStyles[node.type.name])
      return stylable
    },
    stylesOfBlocks(): CustomStyleInstance[][] {
      return this.stylableBlocks.map(b => activeCustomStyles(b.node, this.availableStyles))
    },
    innerParaLikeIndex(): number | undefined {
      const blocks = this.stylableBlocks
      if (blocks.length > 0) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          const node = blocks[i].node
          const typeName = node.type.name
          if (typeName === NODE_NAME_PARAGRAPH || typeName === NODE_NAME_HEADING || typeName === NODE_NAME_PLAIN)
            return i
        }
      }
    },
    innerParaLike(): Node | undefined {
      const index = this.innerParaLikeIndex
      return index !== undefined ? this.stylableBlocks[index].node : undefined
    },
    outerBlocks(): NodeWithPos[] {
      const outer: NodeWithPos[] = []
      const blocks = this.stylableBlocks
      const index = this.innerParaLikeIndex
      if (index !== undefined) {
        let block: NodeWithPos
        for (let i = 0; i < index; i++) {
          block = blocks[i]
          if (!isBlockOfInlines(block.node))
            outer.push(block)
        }
      }
      return outer
    },
    isParagraph() {
      return this.innerParaLike?.type.name === NODE_NAME_PARAGRAPH
    },
    isHeader() {
      return this.innerParaLike?.type.name === NODE_NAME_HEADING
    },
    innerParaLikeActiveStyles(): CustomStyleInstance[] {
      const paraLike = this.innerParaLike
      return paraLike
        ? this.availableStylesForNode(paraLike).filter(s => isCustomStyleActive(s, paraLike))
        : []
    },
    charStyles() {
      return customStylesForType(this.customStyles, 'span')
    },
    styleNames() {
      return this.charStyles.map((s) => s.styleDef.name);
    },
    currentTextMarks(): MarkRange[] {
      const editor = this.editor
      if (editor) {
        const { doc, selection } = editor.state
        const { from, to } = selection;
        return getTextMarkRangesBetween(from, to, doc);
      }
      return []
    },
    currentCharCustomStyles(): MarkRange[] {
      return this.currentTextMarks.filter(
        (m) => m.mark.type.name === MARK_NAME_SPAN && !!m.mark.attrs.customStyle,
      );
    },
    activeCharStyles(): string[] {
      return this.currentCharCustomStyles.map(s => s.mark.attrs.customStyle)
    },
    summary() {
      const blocks = this.currentBlocks
      const stylableBlocks = this.stylableBlocks
      let st_index = 0
      let stylable = stylableBlocks[st_index]
      const summ: {
        type: 'node' | 'style' | 'char',
        label: string,
        icon: string
      }[] = []
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i]
        if (block.pos === stylable?.pos) {
          summ.push({
            type: 'node',
            label: nodeOrMarkToPandocName(block.node.type.name),
            icon: this.iconForNode(block.node)
          })
          this.stylesOfBlocks[st_index]
            .map(csi => csi.styleDef.name)
            .forEach(csname => {
              summ.push({
                type: 'style',
                label: csname,
                icon: 'mdi-palette-swatch-variant'
              })
            })
          stylable = stylableBlocks[++st_index]
        } else {
          if (block.node) summ.push({
            type: 'node',
            label: nodeOrMarkToPandocName(block.node.type.name),
            icon: this.iconForNode(block.node)
          })
        }
      }
      this.activeCharStyles.forEach(s => {
        summ.push({ type: 'style', label: s, icon: 'character_style' })
      })
      return summ
    }
  },
  methods: {
    hasCustomStyles(nodeTypeName: string) {
      const styles = this.availableStyles[nodeTypeName]
      return styles && styles.length > 0
    },
    availableStylesForNode(n: Node): CustomStyleInstance[] {
      return this.availableStyles[n.type.name] || []
    },
    availableParaStylesForNode(n: Node): CustomStyleInstance[] {
      return this.availableStylesForNode(n).filter(s => {
        return s.element === 'paragraph'
      })
    },
    availableHeaderStylesForNode(n: Node, level?: number): CustomStyleInstance[] {
      return this.availableStylesForNode(n).filter(s => {
        return s.element === 'heading'
          && (!level || level === s.attrs.level)
      })
    },
    availableStyleNamesForNode(n: Node): string[] {
      return this.availableStylesForNode(n).map(cs => cs.styleDef.name)
    },
    customStylesOfNode(n: Node): string[] {
      return activeCustomStyles(n, this.availableStylesForNode(n))
        .map(cs => cs.styleDef.name)
    },
    iconForNode(node: Node) {
      const typeName = node.type.name
      if (typeName === NODE_NAME_PARAGRAPH)
        return 'paragraph_style'
      else if (typeName === NODE_NAME_HEADING)
        return 'mdi-format-header-pound'
      return nodeIcon(node.type.name)
    },
    blockName(n: Node) {
      return nodeOrMarkToPandocName(n)
    },
    title(n: Node) {
      const name = n.type.name
      const styles = this.customStylesOfNode(n)
      const currentlyActive = styles.length > 0 ? `currently active: ${styles.join(',')}` : 'none currently active'
      return `${name} custom ${name === 'paragraph' ? 'style' : 'class'} (${currentlyActive})`
    },
    label(n: Node): string {
      const styles = this.customStylesOfNode(n)
      const noStyles = styles.length === 0
      switch (n.type.name) {
        case 'paragraph':
          return 'P' + (noStyles ? '' : `(${styles.join(',')})`)
        case 'heading':
          return 'h' + n.attrs.level + (noStyles ? '' : `.${styles.join(',')}`)
        default:
          return n.type.name + (noStyles ? '' : `.${styles.join('.')}`)
      }
    },
    description(cs: CustomStyleInstance): string {
      return [cs.styleDef.description || '', cs.deprecated ? '(deprecated)' : ''].join(' ')
    },
    styleLabel(cs: CustomStyleInstance) {
      const label = labelForStyle(cs)
      return cs.deprecated ? `<del>${label}</del>` : label
    },
    setCustomStyle(nodeOrType: Node | string, cs: CustomStyleInstance, pos?: number) {
      if (pos)
        this.editor.chain().setCustomStyle(nodeOrType, cs, pos).run()
      else
        this.editor.chain().runRepeatableCommand('setCustomStyle', `style as "${cs.styleDef.name}"`, nodeOrType, cs).run()
    },
    unsetCustomStyle(nodeOrType: Node | string, cs: CustomStyleInstance, pos?: number) {
      if (pos)
        this.editor.chain().unsetCustomStyle(nodeOrType, cs, pos).run()
      else
        this.editor.chain().runRepeatableCommand('unsetCustomStyle', `remove "${cs.styleDef.name}" style`, nodeOrType, cs).run()
    },
    isCustomStyleActive(cs: CustomStyleInstance, node: Node) {
      return isCustomStyleActive(cs, node)
    },
    toggleStyle(cs: CustomStyleInstance, node: Node, pos?: number) {
      if (isCustomStyleActive(cs, node)) {
        this.unsetCustomStyle(node.type.name, cs, pos)
      } else {
        // it should be only one active style
        const activeStyles = activeCustomStyles(node, this.availableStyles)
        activeStyles.forEach(active => {
          this.unsetCustomStyle(node.type.name, active, pos)
        })
        this.setCustomStyle(node.type.name, cs, pos)
      }
    },
    isParaWithoutStyles(): boolean {
      return this.isParagraph && this.innerParaLikeActiveStyles.length === 0
    },
    setParaWithoutCustomStyles() {
      if (this.innerParaLike)
        this.editor?.commands.runRepeatableCommand('unsetParagraphCustomStyle', 'set as paragraph without custom style')
    },
    isHeaderWithoutStyles(level?: number): boolean {
      const h = this.innerParaLike
      return this.isHeader
        && (!level || level === h?.attrs.level)
        && this.innerParaLikeActiveStyles.length === 0
    },
    setHeaderWithoutCustomStyles(level: number) {
      if (this.innerParaLike)
        this.editor?.commands.runRepeatableCommand('setHeading', `set as header of level ${level}`, { level, classes: [] })
    },
    // custom classes for outer blocks
    customClassesFor(node: Node) {
      const cc = customClassesForNodeOrMark(
        node,
        this.configuration?.customClasses || [],
        this.availableStylesForNode(node)
      )
      // const cs = customStylesForType(this.availableStylesForNode(node), node.type)
      return cc
    },
    isCustomClassActive(c: string | CustomClass, node: Node) {
      const className = isString(c) ? c : c.name
      return node.attrs?.classes.indexOf(className) >= 0
    },
    toggleClass(cc: CustomClass, nwp: NodeWithPos) {
      this.editor.commands.runRepeatableCommand(
        'toggleCustomClass',
        `toggle custom class "${cc.name}"`,
        cc
      )
    },
    isCharStyleActive(cs: CustomStyleInstance) {
      return this.activeCharStyles.indexOf(cs.styleDef.name) >= 0
    },
    setCharStyle(style: CustomStyleInstance) {
      this.editor.chain().runRepeatableCommand('setCustomMark', `style as "${style.styleDef.name}"`, MARK_NAME_SPAN, style).run()
    },
    unsetCharStyle(style: CustomStyleInstance) {
      this.editor.chain().runRepeatableCommand('unsetCustomMark', `remove "${style.styleDef.name}" style`, MARK_NAME_SPAN, style).run()
    },
    unsetAllCharStyles() {
      const names = this.activeCharStyles
      this.charStyles.filter(cs => names.indexOf(cs.styleDef.name) >= 0).forEach(cs => {
        this.unsetCharStyle(cs)
      })
    },
    toggleCharStyle(cs: CustomStyleInstance) {
      if (this.isCharStyleActive(cs)) {
        this.unsetCharStyle(cs)
      } else {
        this.setCharStyle(cs)
      }
    },
  }
}
</script>

<style>
span.style-item {
  color: black;
}

span.style-item i {
  font-size: small;
}
</style>
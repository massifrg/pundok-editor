<template>
  <q-card>
    <q-table v-if="allAttributes.length > 0" hide-bottom :rows="allAttributes" :columns="columns" row-key="key"
      v-model:pagination="pagination" :rows-per-page-options="[0]" binary-state-sort>
      <template #body="props">
        <q-tr :props="props">
          <q-td v-for="col in (props.cols as Record<string, string>[])" :key="col.name" :props="props">
            <span :class="classForAttributeName(props.row)" :title="props.row.description">{{ col.value }}</span>
          </q-td>
          <q-td auto-width>
            <q-btn v-if="isAddable(props.row)" size="sm" class="q-mx-xs" color="accent" round dense icon="mdi-plus"
              @click="add(props.row)" :title="titleForAvailableAttribute(props.row.key)" />
            <q-btn v-if="hasSuggestions(props.row)" size="sm" class="q-mx-xs" color="accent" round dense
              icon="mdi-dots-horizontal" title="suggestions...">
              <q-menu auto-close>
                <q-list>
                  <q-item v-for="s in (props.row.suggestions as string[])" dense clickable
                    @click="setNewValueForAttr(props.row.key, s)">{{ s }}</q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-btn v-if="hasFixedSetOfValues(props.row)" size="sm" class="q-mx-xs" color="accent" round dense
              icon="mdi-dots-vertical" title="choose one from this set of values...">
              <q-menu auto-close>
                <q-list>
                  <q-item v-for="v in (props.row.values as string[])" dense clickable
                    @click="setNewValueForAttr(props.row.key, v)">{{ v }}</q-item>
                </q-list>
              </q-menu>
            </q-btn>
            <q-btn v-if="isEditable(props.row)" size="sm" class="q-mx-xs" color="accent" round dense icon="mdi-pencil"
              @click="edit(props.key)" title="edit" />
            <q-btn v-if="isRemovable(props.row)" size="sm" class="q-mx-xs" color="accent" round dense icon="mdi-close"
              @click="remove(props.key)" title="remove" />
            <q-btn v-if="isModified(props.row)" size="sm" class="q-mx-xs" color="accent" round dense icon="mdi-reload"
              @click="reset(props.key)" title="reset" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
    <q-space />
    <q-card-actions vertical align="center">
      <q-btn icon="mdi-plus" color="primary" title="add an attribute" @click="showAddAttrDialog = true" />
      <q-dialog v-model="showAddAttrDialog" persistent>
        <q-card>
          <q-card-section>
            <q-input :model-value="attrToAdd" autofocus :label="newAttrLabel"
              :color="invalidAttrName ? 'red' : 'primary'" @update:model-value="updateAttrToAdd"
              @keydown="newAttrKeydown" />
          </q-card-section>
          <q-card-actions>
            <q-space />
            <q-btn :disable="invalidAttrName" label="Add" color="primary" @click="addNewAttrName(attrToAdd)" />
            <q-btn label="Cancel" color="primary" @click="closeAddAttrDialog" />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <q-dialog v-model="showEditAttrDialog" persistent>
        <q-card>
          <q-card-section>
            <q-input :model-value="attrNewValue" autofocus :label="attrNewValueLabel()"
              @update:model-value="updateAttrNewValue" @keydown="attrNewValueKeydown" />
          </q-card-section>
          <q-card-actions>
            <q-space />
            <q-btn label="Ok" color="primary" @click="setNewValueForEditedAttr()" />
            <q-btn label="Cancel" color="primary" @click="closeEditAttrDialog" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </q-card-actions>
  </q-card>
</template>

<script lang="ts">
import { QTableProps } from 'quasar'
import { isString } from 'lodash'
import { setupQuasarIcons } from '../helpers/quasarIcons'
import { CustomAttribute, CustomClass, CustomStyleInstance, customAttributesForNodeOrMark } from '../../common'
import { isDuplicatedKvAttribute, matchingDuplicatedAttribute } from '../../schema/helpers'
import { getEditorConfiguration } from '../../schema'
import { ref } from 'vue'

interface OtherAttribute {
  key: string,
  editable: boolean,
  value: string,
  addableButNotPresent?: boolean,
  description?: string,
  suggestions: string[],
  values: string[],
  default: string,
  editAs?: string,
}

const columns: QTableProps['columns'] = [
  {
    name: 'key',
    label: 'key',
    field: 'key',
    sortable: true,
    align: 'left'
  },
  {
    name: 'value',
    label: 'value',
    field: 'value',
    sortable: false,
    align: 'left'
  },
  {
    name: 'actions',
    label: '',
    field: 'actions'
  }
]

export default {
  props: [
    'editor',
    'nodeOrMark',
    'attrName',
    'originalEntries',
    'initialEntries',
    'forbiddenAttrNames',
    'classes'
  ],
  emits: ['update-attribute'],
  setup() {
    setupQuasarIcons()
    return {
      columns,
      rows: [],
      pagination: ref({
        rowsPerPage: 0
      })
    }
  },
  data() {
    const entries = [] as OtherAttribute[]
    const initialEntries: OtherAttribute[] = this.initialEntries || []
    initialEntries.forEach(e => { entries.push(e) });
    return {
      entries,
      showAddAttrDialog: false,
      attrToAdd: '',
      showEditAttrDialog: false,
      editedAttrName: '',
      attrNewValue: '' as string | number
    };
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    customStyles(): CustomStyleInstance[] {
      return this.configuration?.customStylesInstances || []
    },
    customAttributes(): CustomAttribute[] {
      return this.configuration?.customAttributes || []
    },
    customClasses(): CustomClass[] {
      return this.configuration?.customClasses || []
    },
    availableCustomAttributes(): CustomAttribute[] {
      return this.nodeOrMark
        ? customAttributesForNodeOrMark(
          this.nodeOrMark,
          this.customAttributes,
          this.customStyles,
          this.customClasses,
          this.classes
        )
        : []
    },
    availableCustomAttribute(): Record<string, CustomAttribute> {
      const aca: Record<string, CustomAttribute> = {}
      this.availableCustomAttributes.forEach(a => {
        aca[a.name] = a
      })
      return aca
    },
    allAttributes() {
      const foundCustomAttribute: Record<string, boolean> = {}
      const attributes: OtherAttribute[] = this.entries.map(e => {
        const key = e.key
        const fca = this.availableCustomAttribute[key]
        if (fca) foundCustomAttribute[key] = true
        return {
          key,
          editable: !isDuplicatedKvAttribute(this.nodeOrMark, e.key),
          value: e.value || fca?.default || '',
          addableButNotPresent: false,
          description: fca?.description,
          suggestions: fca?.suggestions || [],
          values: fca?.values || [],
          default: fca?.default || ''
        }
      })
      this.availableCustomAttributes.forEach(aca => {
        if (!foundCustomAttribute[aca.name]) {
          attributes.push({
            key: aca.name,
            editable: !isDuplicatedKvAttribute(this.nodeOrMark, aca.name),
            value: aca.default || '',
            addableButNotPresent: true,
            description: aca.description,
            suggestions: aca.suggestions || [],
            values: aca.values || [],
            default: aca.default || ''
          })
        }
      })
      return attributes
    },

    invalidAttrError(): string | undefined {
      const entries = this.entries as OtherAttribute[]
      if (entries.map(e => e.key).includes(this.attrToAdd)) return 'attribute already present!'
      if ((this.forbiddenAttrNames || []).includes(this.attrToAdd)) return 'this attribute name is forbidden here!'
      return undefined
    },
    invalidAttrName() {
      return (this.invalidAttrError !== undefined) || this.attrToAdd.length === 0
    },
    newAttrLabel() {
      return this.invalidAttrError || 'new attribute name (key)'
    }
  },
  watch: {
    initialEntries(newEntries) {
      this.entries = [].concat(newEntries || []) as OtherAttribute[];
    },
  },
  methods: {
    isEditable(a: OtherAttribute) {
      if (a.key == 'descrizione') console.log(a)
      return this.isPresent(a) && a.editable && (!a.values || a.values.length === 0)
    },
    isRemovable(a: OtherAttribute) {
      return this.isPresent(a) && a.editable
    },
    hasSuggestions(a: OtherAttribute) {
      return !a.addableButNotPresent && a.suggestions && a.suggestions.length > 0
    },
    hasFixedSetOfValues(a: OtherAttribute) {
      return !a.addableButNotPresent && a.values && a.values.length > 0
    },
    isPresent(a: OtherAttribute) {
      return !a.addableButNotPresent
    },
    isAddable(a: OtherAttribute) {
      return a.addableButNotPresent
    },
    isModified(a: OtherAttribute): boolean {
      const attrName = a.key
      const original = this.entryWithKey(attrName, this.originalEntries)
      const maybeModified = this.entryWithKey(attrName, this.entries)
      return original && maybeModified ? original.value != maybeModified.value : false
    },
    classForAttributeName(a: OtherAttribute) {
      return a.addableButNotPresent ? 'only-available' : ''
    },
    titleForAvailableAttribute(attrName: string) {
      const customAttribute = this.availableCustomAttributes.find(ca => ca.name === attrName)
      let title = `add "${attrName}" attribute`
      if (customAttribute?.description) title = `${title}, ${customAttribute.description}`
      return title
    },
    emitUpdate() {
      this.$emit('update-attribute', this.attrName, Object.fromEntries((this.entries as OtherAttribute[]).map(e => [e.key, e.value])))
    },
    entryWithKey(key: string, entries?: any[]): OtherAttribute | undefined {
      if (entries) {
        return (entries as OtherAttribute[]).find(e => e.key === key)
      }
      return undefined
    },
    remove(key: string) {
      this.entries = (this.entries as OtherAttribute[]).filter(e => e.key !== key)
      this.emitUpdate()
    },
    reset(key: string) {
      const originalEntry = this.entryWithKey(key, this.originalEntries)
      if (originalEntry !== undefined) {
        this.entries = (this.entries as OtherAttribute[]).map(e => e.key === key ? { ...e, value: originalEntry.value } : e)
        const matchingAttr = matchingDuplicatedAttribute(this.nodeOrMark, key)
        if (matchingAttr) this.$emit('update-attribute', matchingAttr, originalEntry.value)
      }
    },
    updateAttrToAdd(newValue: string | number | null) {
      if (isString(newValue)) this.attrToAdd = newValue
    },
    newAttrKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter' && !this.invalidAttrName) {
        this.addNewAttrName(this.attrToAdd)
        e.preventDefault()
      }
      if (e.key === 'Escape') this.closeAddAttrDialog()
    },
    addNewAttrName(newAttrName: string) {
      let eqIndex = 0
      while (0 < (eqIndex = newAttrName.indexOf('=', eqIndex))) {
        if (newAttrName.charAt(eqIndex - 1) === "\\")
          eqIndex++
        else
          break
      }
      const key = eqIndex > 0 ? newAttrName.substring(0, eqIndex) : newAttrName
      const value = eqIndex > 0 ? newAttrName.substring(eqIndex + 1) : ''
      this.entries.push({
        key,
        editable: true,
        value,
        suggestions: [],
        values: [],
        default: ''
      })
      this.closeAddAttrDialog()
      this.emitUpdate()
    },
    closeAddAttrDialog() {
      this.showAddAttrDialog = false
      this.attrToAdd = ''
    },
    add(a: OtherAttribute) {
      const value = a.values && a.values.length > 0 ? a.default || a.values[0] : ''
      this.entries = this.entries.concat([{ ...a, value, addableButNotPresent: false, editable: true }])
      this.emitUpdate()
    },
    edit(attrName: string) {
      this.editedAttrName = attrName
      const entry = this.entryWithKey(attrName, this.entries)
      this.attrNewValue = entry?.value || ''
      this.showEditAttrDialog = true
    },
    attrNewValueLabel() {
      return `new value for "${this.editedAttrName}"`
    },
    updateAttrNewValue(newValue: string | number | null) {
      if (newValue) this.attrNewValue = newValue
    },
    attrNewValueKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        this.setNewValueForEditedAttr()
        e.preventDefault()
      }
      if (e.key === 'Escape') this.closeEditAttrDialog()
    },
    setNewValueForAttr(attrName: string, newAttrValue: string | number) {
      let changed = false
      const newEntries: OtherAttribute[] = this.entries.map(e => {
        if (e.key === attrName && e.value != newAttrValue) {
          changed = true
          return { ...e, value: newAttrValue } as OtherAttribute
        } else {
          return e
        }
      })
      if (changed) {
        this.entries = newEntries
        this.emitUpdate()
      }
    },
    setNewValueForEditedAttr(dontCloseDialog?: boolean) {
      this.setNewValueForAttr(this.editedAttrName, this.attrNewValue)
      if (!dontCloseDialog) this.closeEditAttrDialog()
    },
    closeEditAttrDialog() {
      this.showEditAttrDialog = false
      this.editedAttrName = ''
      this.attrNewValue = ''
    }
  },
};
</script>

<style>
td span.only-available {
  color: #ccc;
}
</style>
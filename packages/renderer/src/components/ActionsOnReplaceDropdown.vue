<script lang="ts">
import { toRaw } from 'vue';
import { QBtnDropdown } from 'quasar';
import { ActionName, defaultPropsFor } from '../actions';
import {
  ActionNameWithProps,
  AddOrRemoveClassActionProps,
  AddOrRemoveCustomClassActionProps,
  AddOrRemoveCustomStyleActionProps,
  AddOrRemoveMarkActionProps,
  attrsToCssSelectorString,
  InsertRawInlineActionProps,
  PundokEditorConfig,
  SetIndexRefActionProps,
  SetSpanActionProps
} from '../common';
import ActionsList from './ActionsList.vue';
import { getEditorConfiguration } from '../schema';
import { t } from '../i18n'

function actionsAsText(actions: ActionNameWithProps[], config?: PundokEditorConfig) {
  if (!actions || actions.length === 0)
    return t('search.actions.noAction')
  return actions.map(a => {
    const actionName = a.name as ActionName
    const prefix = actionName.startsWith('add')
      ? '+'
      : actionName.startsWith('remove')
        ? '-'
        : ''
    const props = a?.props || defaultPropsFor(actionName)
    switch (actionName) {
      case 'add-mark':
      case 'remove-mark':
        {
          const { markType } = props as AddOrRemoveMarkActionProps
          return `${prefix}${markType}`
        }
      case 'add-custom-style':
      case 'remove-custom-style':
        {
          const { styleName } = props as AddOrRemoveCustomStyleActionProps
          return `${prefix}${styleName}`
        }
      case 'add-custom-class':
      case 'remove-custom-class':
        {
          const { shortDesc, className, attrs } = props as AddOrRemoveCustomClassActionProps
          const attrstext = !shortDesc && attrs
            ? attrsToCssSelectorString({ attributes: attrs })
            : ''
          return `${prefix}${shortDesc || className + attrstext}`
        }
      case 'add-class':
      case 'remove-class':
        {
          const { className } = props as AddOrRemoveClassActionProps
          return `${prefix}.${className}`
        }
      case 'set-span':
        {
          const { alternativeIndex, alternatives, classes, attrs } = toRaw(props) as SetSpanActionProps
          const altCount = alternatives && alternatives.length || 0
          const altIndex = alternativeIndex !== undefined ? alternativeIndex : -1
          return altIndex >= 0 && altIndex < altCount
            ? `+${alternatives![alternativeIndex].name}`
            : `+${attrsToCssSelectorString({ classes, attributes: attrs })}`
        }
      case 'set-index-ref':
        {
          const { indexName } = toRaw(props) as SetIndexRefActionProps
          return `index as ${indexName}`
        }
      case 'insert-raw-inline':
        {
          const { format, content, where } = toRaw(props) as InsertRawInlineActionProps
          const isPair = content && Array.isArray(content) && content.length > 1
          const what = isPair ? content.join('...') : content || '??'
          const _where = isPair ? '' : ' ' + where.toUpperCase()
          return `+RawInline(${format}) ${what}${_where}`
        }
      default:
        return actionName
    }
  }).join(',')
}

export default {
  props: ['editor', 'actions', 'searchOnly'],
  emits: ['update-actions'],
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    }
  },
  data() {
    return {
      isEmpty: true,
      label: actionsAsText(this.actions, getEditorConfiguration(this.editor))
    }
  },
  watch: {
    actions(value) {
      this.isEmpty = !value || value.length === 0
      this.label = actionsAsText(value, this.configuration)
    }
  },
  components: {
    ActionsList
  },
  methods: {
    update(actions: ActionNameWithProps[]) {
      this.isEmpty = !actions || actions.length === 0
      this.label = actionsAsText(actions, this.configuration)
      // forward event
      this.$emit('update-actions', actions)
    },
    hideMenu() {
      (this.$refs.actionsOnReplace as QBtnDropdown).hide()
    }
  }
}
</script>
<template>
  <q-btn-dropdown ref="actionsOnReplace" class="q-ma-xs" size="sm" rounded color="primary" :outline="isEmpty"
    :label="label" no-caps>
    <!-- :no-caps="noneActive || operation === 'remove all'" :menu-anchor="menuAnchor" :menu-self="menuSelf" -->
    <ActionsList :editor="editor" :start-actions="actions" :searchOnly="searchOnly" style="min-width: 100%;"
      @update-actions="update" @close="hideMenu()" />
  </q-btn-dropdown>
</template>
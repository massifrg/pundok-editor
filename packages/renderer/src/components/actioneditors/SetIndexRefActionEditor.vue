<template>
  <q-card-actions style="min-width: 300px">
    <q-btn-dropdown :label="selectedIndex?.indexName" :icon="selectedIndex?.iconSvg || 'mdi-cursor-pointer'" no-caps>
      <q-list>
        <q-item v-for="i in indices" dense clickable v-close-popup
          :title="`add a reference to a term in index ${i.indexName}`" @click="setIndexName(i)">
          <q-item-section><q-item-label>{{ i.indexName }}</q-item-label></q-item-section>
        </q-item>
      </q-list>
    </q-btn-dropdown>
  </q-card-actions>
</template>

<script lang="ts">
import { Index, DEFAULT_INDEX_NAME, SetIndexRefActionProps } from '../../common';
import { setupQuasarIcons } from '../helpers/quasarIcons';
import { getEditorConfiguration } from '../../schema';
import { defaultPropsFor } from '../../actions';

export default {
  props: ['editor', 'index', 'action'],
  emits: ['set-props'],
  data() {
    const props: SetIndexRefActionProps = this.action?.props
      || defaultPropsFor(this.action.name)
      || { indexName: DEFAULT_INDEX_NAME }
    return {
      indexName: props.indexName,
    } as SetIndexRefActionProps
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    indices() {
      return this.configuration?.indices || []
    },
    selectedIndex(): Index | undefined {
      return this.indices.find(i => i.indexName === this.indexName)
    },
  },
  setup() {
    setupQuasarIcons()
  },
  methods: {
    setIndexName(i: Index) {
      this.indexName = i.indexName
      this.updateProps()
    },
    updateProps() {
      this.$emit('set-props', this.index, {
        indexName: this.indexName,
      } as SetIndexRefActionProps)
    }
  }
}
</script>
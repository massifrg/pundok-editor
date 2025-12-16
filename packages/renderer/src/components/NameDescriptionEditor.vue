<template>
  <q-input outlined v-model="name" type="text" label="settings name" @change="emitSetName">
    <template v-slot:append>
      <q-btn-dropdown v-if="library && library.length > 0" size="sm" color="primary" outline>
        <q-list>
          <q-item v-for="item in ((library || []) as NameDescription[])" clickable v-close-popup
            @click="loadExisting(item)">
            <q-item-section>{{ item.name }}</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </template>
  </q-input>
  <q-input outlined v-model="description" type="textarea" label="description" :shadow-text="shadowDescription"
    @change="emitSetDescription" />
</template>

<script lang="ts">
interface NameDescription {
  name: string,
  description: string,
}

export default {
  props: ['startName', 'startDescription', 'library', 'shadowDescription'],
  emits: ['set-name', 'set-description'],
  data() {
    return {
      name: this.startName || '',
      description: this.startDescription || '',
    }
  },
  computed: {
    existingNames(): string[] {
      return ((this.library || []) as NameDescription[]).map(item => item.name)
    },
    // isExistingName(): boolean {
    //   return this.existingNames.indexOf(this.name) >= 0
    // },
  },
  watch: {
    startName(name) {
      this.name = name
    },
    startDescription(desc) {
      this.description = desc
    }
  },
  methods: {
    loadExisting(item: NameDescription) {
      this.name = item.name
      this.description = item.description || ''
      this.emitSetName()
      this.emitSetDescription()
    },
    emitSetName() {
      this.$emit('set-name', this.name)
    },
    emitSetDescription() {
      this.$emit('set-description', this.description)
    },
  }
}
</script>
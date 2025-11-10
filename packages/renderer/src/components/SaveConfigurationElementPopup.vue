<template>
  <q-popup-proxy>
    <q-card>
      <q-card-section>
        <div class="text-subtitle1">Save settings to:</div>
        <q-radio v-model="destinationIndex" v-for="(sd, i) in saveDestinations" :val="i" :label="destinationLabel(sd)"
          :title="destinationTitle(sd)" />
        <q-input outlined v-model="name" type="text" label="settings name">
          <template v-slot:append>
            <q-btn-dropdown title="update existing settings" size="sm" color="primary" outline>
              <q-list>
                <q-item v-for="eo in (existingOnes as Automation[])" clickable v-close-popup @click="loadExisting(eo)">
                  <q-item-section>{{ eo.name }}</q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </template>
        </q-input>
        <q-input outlined v-model="description" type="textarea" label="description" :shadow-text="shadowDescription" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn :disabled="!saveEnabled" color="primary" label="save" @click="emitSaveSettings()" v-close-popup />
        <q-btn color="primary" label="cancel" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-popup-proxy>
</template>

<script lang="ts">
import { Automation, PundokEditorProject } from '../common';
import { getEditorConfiguration, getEditorProject } from '../schema';

interface SaveDestination {
  name: string,
  isProject: boolean,
}

export default {
  props: ['editor', 'startValue', 'existingOnes'],
  emits: ['save-settings'],
  data() {
    return {
      name: this.startValue || '',
      description: '',
      destinationIndex: -1,
    }
  },
  computed: {
    configuration() {
      return getEditorConfiguration(this.editor)
    },
    project(): PundokEditorProject | undefined {
      return getEditorProject(this.editor)
    },
    configurationsNames() {
      return this.project
        ? this.project?.configurations
        : this.configuration
          ? [this.configuration?.name]
          : []
    },
    saveDestinations(): SaveDestination[] {
      let dests = this.configurationsNames?.map(c => ({ name: c, isProject: false } as SaveDestination)) || []
      if (this.project) {
        const projectDest = { name: this.project.name, isProject: true }
        dests = [projectDest, ...dests]
        if (this.destinationIndex < 0) this.destinationIndex = 0
      }
      return dests
    },
    saveEnabled(): boolean {
      const count = this.saveDestinations.length
      const index = this.destinationIndex
      return this.name && this.name.length > 0 && count > 0 && index >= 0 && index < count
    },
    shadowDescription() {
      return this.description.length > 0 ? '' : "Write here a description of the settings"
    },
  },
  watch: {
    configurationsNames(_: string[]) {
      this.destinationIndex = -1
    },
    existingOnes(_: Automation[]) {
      this.name = ''
      this.description = ''
    }
  },
  methods: {
    destinationLabel(sd: SaveDestination): string {
      const { name, isProject } = sd
      return isProject ? `project ${name}` : name
    },
    destinationTitle(sd: SaveDestination): string {
      const { name, isProject } = sd
      return `Save settings to ${isProject ? 'project' : 'configuration'} "${name}"`
    },
    loadExisting(settings: Automation) {
      this.name = settings.name
      this.description = settings.description || ''
    },
    emitSaveSettings() {
      const count = this.saveDestinations.length
      const index = this.destinationIndex
      const dest = this.saveDestinations[this.destinationIndex]
      if (index >= 0 && index < count && this.name.length > 0 && dest)
        this.$emit(
          'save-settings',
          this.name,
          this.description.length > 0 ? this.description : undefined,
          dest.isProject ? undefined : dest.name
        )
    },
  }
}
</script>
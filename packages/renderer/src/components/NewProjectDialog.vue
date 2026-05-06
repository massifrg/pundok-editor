<template>
  <q-dialog :model-value="visible" full-width>
    <q-card class="shadow shadow-24">
      <q-card-section>
        New project:
        <NameDescriptionEditor :start-name="name" :start-description="description" @set-name="setName"
          @set-description="setDescription" />
      </q-card-section>
      <q-card-section horizontal class="q-mx-md">
        <q-btn-dropdown icon="add" title="add configurations to inherit">
          <q-list>
            <q-item v-for="c in unselectedConfigs" dense clickable v-close-popup @click="addConfig(c.name)">
              <q-list-item-section><b>{{ c.name }}</b> - {{ c.description }}</q-list-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
        <div class="q-pa-sm">Configurations:</div>
        <q-chip v-for="c in configurations" removable icon-remove="remove_item" @remove="removeConfig(c)">
          {{ c }}
        </q-chip>
      </q-card-section>
      <q-card-section horizontal class="q-mx-md">
        <q-btn icon="folder" title="select project folder" @click="selectFolder" />
        <q-chip v-if="path !== undefined" square>{{ path }}</q-chip>
      </q-card-section>
      <q-card-section v-if="path !== undefined" horizontal class="q-mx-md">
        <q-btn icon="root_document" title="select root document" @click="selectRootDocument" />
        <q-chip v-if="rootDocument !== undefined" square>{{ rootDocument }}</q-chip>
      </q-card-section>
      <q-card-actions>
        <q-space />
        <q-btn :disabled="!canCreate" label="Ok" @click="onOk"></q-btn>
        <q-btn label="Cancel" @click="onCancel"></q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { setupQuasarIcons } from './helpers';
setupQuasarIcons()
</script>

<script lang="ts">
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import NameDescriptionEditor from './NameDescriptionEditor.vue';
import { parse as parsePath } from 'path-browserify';
import { ConfigurationSummary, getInheritedConfigName, PundokEditorConfigInit, PundokEditorProject } from '../common';
import { showOpenDocumentDialog, showSelectFolderDialog } from './helpers';
import { getEditorDocState } from '../schema';

export default {
  props: ['editor', 'visible'],
  emits: ['close'],
  components: {
    NameDescriptionEditor
  },
  data() {
    return {
      name: '',
      description: '',
      path: undefined as string | undefined,
      rootDocument: undefined as string | undefined,
      availableConfigs: [] as ConfigurationSummary[],
      configurations: [] as string[],
      editorConfig: {} as Partial<PundokEditorConfigInit>,
    }
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    unselectedConfigs(): ConfigurationSummary[] {
      return this.availableConfigs.filter(ac => !this.configurations.includes(ac.name))
    },
    canCreate() {
      return this.name.length > 0
        && this.description.length > 0
        && this.path
    },
  },
  async mounted() {
    this.availableConfigs = await this.backend?.availableConfigurations() || []
  },
  methods: {
    setName(name: string) {
      this.name = name
    },
    setDescription(description: string) {
      this.description = description
    },
    addConfig(configName: string) {
      this.configurations = [...this.configurations, configName]
    },
    removeConfig(configName: string) {
      this.configurations = this.configurations.filter(c => c !== configName)
    },
    async selectFolder() {
      const docState = getEditorDocState(this.editor)
      showSelectFolderDialog({
        editor: this.editor,
        options: {
          prompt: 'Select the project folder:',
          startFolder: docState?.workingFolder,
        },
        callback: async ({ path }) => {
          if (path) {
            this.path = path
            const existingProject = await this.backend?.getProject({ path })
            if (existingProject) {
              const { name, description, configurations, rootDocument, editorConfig } = existingProject
              this.setName(name || '')
              this.setDescription(description || '')
              this.configurations = configurations?.map(c =>
                getInheritedConfigName(c) as string) || []
              this.rootDocument = rootDocument
              this.editorConfig = editorConfig
            }
          }
        }
      })
    },
    async selectRootDocument() {
      const startFolder = this.path && parsePath(this.path).dir || undefined
      showOpenDocumentDialog({
        editor: this.editor,
        options: {
          prompt: 'Select the root document:',
          startFolder,
        },
        callback: ({ path }) => {
          if (path) {
            const { dir, base } = parsePath(path)
            if (dir === this.path) {
              this.rootDocument = base
            } else {
              this.$q.notify({
                message: 'the root document must be a file in the project folder',
                caption: '',
                icon: 'alert_circle',
                position: 'top',
                color: 'negative',
                timeout: 3000,
              })
            }
          }
        }
      })
    },
    onCancel() {
      this.$emit('close')
    },
    async onOk() {
      const project: Partial<PundokEditorProject> = {
        name: this.name,
        description: this.description,
        rootDocument: this.rootDocument!,
        configurations: this.configurations,
        editorConfig: this.editorConfig,
      }
      try {
        await this.backend?.createProject(this.path!, project)
        this.$q.notify({
          message: `project "${this.name}" successfully created in ${this.path}`,
          caption: '',
          icon: 'check',
          position: 'top',
          color: 'positive',
          timeout: 2000,
        })
      } catch (err) {
        console.log(err)
      }
      this.$emit('close')
    },
  }
}
</script>
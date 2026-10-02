<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="min-width: 36rem">
      <q-card-section class="text-h6">{{ title }}</q-card-section>
      <q-card-section>
        <q-input v-model="url" :label="$t('gitRepositoryDialog.repositoryUrl')" outlined />
        <q-input v-model="user" :label="$t('gitRepositoryDialog.username')" outlined class="q-mt-sm" />
        <q-input v-model="password" :label="$t('gitRepositoryDialog.password')" type="password" outlined class="q-mt-sm" />
        <q-input v-if="mode === 'clone'" v-model="destination" :label="$t('gitRepositoryDialog.destination')" outlined class="q-mt-sm" readonly>
          <template #append><q-btn flat icon="folder" @click="chooseDestination" /></template>
        </q-input>
        <q-select v-if="mode === 'clone' && projects.length" v-model="selectedProject" :options="projects" option-label="name" :label="$t('gitRepositoryDialog.project')" outlined class="q-mt-sm" />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-if="mode === 'clone'" :label="$t('gitRepositoryDialog.scan')" :disable="!url || !user" @click="scan" />
        <q-btn :label="actionLabel" color="primary" :disable="!url || !user || (mode === 'clone' && !destination)" @click="submit" />
        <q-btn :label="$t('gitRepositoryDialog.cancel')" @click="$emit('close')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import type { Editor } from '@tiptap/vue-3';
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import { showSelectFolderDialog } from './helpers';

export default {
  props: {
    visible: Boolean,
    mode: { type: String, required: true },
    editor: { type: Object as PropType<Editor>, required: true },
    projectPath: { type: String, default: '' },
  },
  emits: ['close', 'done'],
  data() {
    return {
      url: '',
      user: '',
      password: '',
      destination: '',
      projects: [] as Array<{ name: string; description: string; url: string }>,
      selectedProject: undefined as { name: string; description: string; url: string } | undefined,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    title(): string {
      return this.mode === 'clone' ? this.$t('gitRepositoryDialog.cloneTitle') : this.mode === 'publish' ? this.$t('gitRepositoryDialog.shareTitle') : this.$t('gitRepositoryDialog.connectTitle');
    },
    actionLabel(): string { return this.mode === 'clone' ? this.$t('gitRepositoryDialog.clone') : this.mode === 'publish' ? this.$t('gitRepositoryDialog.share') : this.$t('gitRepositoryDialog.connect'); },
  },
  methods: {
    chooseDestination() {
      showSelectFolderDialog({
        editor: this.editor,
        options: { prompt: this.$t('gitRepositoryDialog.selectDestination') },
        callback: ({ path }) => { if (path) this.destination = path; },
      });
    },
    async scan() {
      if (!this.backend) return;
      this.projects = await this.backend.scanGitProjects(this.url, this.user, this.password);
      this.selectedProject = this.projects[0];
    },
    async submit() {
      if (!this.backend) return;
      const remote = this.selectedProject?.url || this.url;
      const result = this.mode === 'clone'
        ? await this.backend.cloneGitProject({ url: remote, user: this.user, password: this.password, destination: this.destination })
        : this.mode === 'publish'
          ? await this.backend.publishGitProject({ projectPath: this.projectPath, url: remote, user: this.user, password: this.password })
          : await this.backend.connectGitProject({ projectPath: this.projectPath, url: remote, user: this.user, password: this.password });
      this.$emit('done', result);
      this.$emit('close');
    },
  },
};
</script>

<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="min-width: 36rem">
      <q-card-section class="text-h6">{{ title }}</q-card-section>
      <q-card-section>
        <q-input
          v-model="url"
          :label="$t('gitRepositoryDialog.repositoryUrl')"
          outlined
        />
        <q-input
          v-model="user"
          :label="$t('gitRepositoryDialog.username')"
          outlined
          class="q-mt-sm"
        />
        <q-input
          v-model="password"
          :label="$t('gitRepositoryDialog.password')"
          type="password"
          outlined
          class="q-mt-sm"
        />
        <q-input
          v-if="mode === 'clone'"
          v-model="destination"
          :label="$t('gitRepositoryDialog.destination')"
          outlined
          class="q-mt-sm"
          readonly
        >
          <template #append
            ><q-btn flat icon="folder" @click="chooseDestination"
          /></template>
        </q-input>
        <q-select
          v-if="mode === 'clone' && projects.length"
          v-model="selectedProject"
          :options="projects"
          option-label="name"
          :label="$t('gitRepositoryDialog.project')"
          outlined
          class="q-mt-sm"
        />
        <q-checkbox
          v-if="mode === 'publish'"
          v-model="privateRepository"
          :label="$t('gitRepositoryDialog.privateRepository')"
          class="q-mt-sm"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          v-if="mode === 'clone'"
          :label="$t('gitRepositoryDialog.scan')"
          :disable="!url || !user"
          @click="scan"
        />
        <q-btn
          :label="actionLabel"
          color="primary"
          :disable="!url || !user || (mode === 'clone' && !destination)"
          @click="submit"
        />
        <q-btn
          :label="$t('gitRepositoryDialog.cancel')"
          @click="$emit('close')"
        />
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
import type { PundokEditorProject } from '../common';

export default {
  props: {
    visible: Boolean,
    mode: { type: String, required: true },
    editor: { type: Object as PropType<Editor>, default: undefined },
    projectPath: { type: String, default: '' },
    project: {
      type: Object as PropType<PundokEditorProject>,
      default: undefined,
    },
  },
  emits: ['close', 'done'],
  data() {
    return {
      url: '',
      user: '',
      password: '',
      destination: '',
      privateRepository: true,
      projects: [] as Array<{ name: string; description: string; url: string }>,
      selectedProject: undefined as
        { name: string; description: string; url: string } | undefined,
    };
  },
  computed: {
    ...mapState(useBackend, ['backend']),
    title(): string {
      return this.mode === 'clone'
        ? this.$t('gitRepositoryDialog.cloneTitle')
        : this.mode === 'publish'
          ? this.$t('gitRepositoryDialog.shareTitle')
          : this.$t('gitRepositoryDialog.connectTitle');
    },
    actionLabel(): string {
      return this.mode === 'clone'
        ? this.$t('gitRepositoryDialog.clone')
        : this.mode === 'publish'
          ? this.$t('gitRepositoryDialog.share')
          : this.$t('gitRepositoryDialog.connect');
    },
  },
  methods: {
    chooseDestination() {
      if (!this.editor) return;
      showSelectFolderDialog({
        editor: this.editor,
        options: { prompt: this.$t('gitRepositoryDialog.selectDestination') },
        callback: ({ path }) => {
          if (path) this.destination = path;
        },
      });
    },
    async scan() {
      if (!this.backend) return;
      this.projects = await this.backend.scanGitProjects(
        this.url,
        this.user,
        this.password,
      );
      this.selectedProject = this.projects[0];
    },
    async submit() {
      if (!this.backend) return;
      const remote = this.repositoryUrl(
        this.selectedProject?.url || this.url,
        this.selectedProject?.name || this.project?.name,
      );
      const result =
        this.mode === 'clone'
          ? await this.backend.cloneGitProject({
              url: remote,
              user: this.user,
              password: this.password,
              destination: this.destination,
            })
          : this.mode === 'publish'
            ? await this.backend.publishGitProject({
                projectPath: this.projectPath,
                url: remote,
                user: this.user,
                password: this.password,
                private: this.privateRepository,
              })
            : await this.backend.connectGitProject({
                projectPath: this.projectPath,
                url: remote,
                user: this.user,
                password: this.password,
              });
      this.$emit('done', result);
      this.$emit('close');
    },
    repositoryUrl(url: string, projectName?: string): string {
      if (!projectName) return url;
      try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (parts.length >= 2) return url;
        const path = parsed.pathname.replace(/\/+$/, '');
        const missingParts = parts.length
          ? [projectName]
          : [this.user, projectName];
        parsed.pathname = `${path}/${missingParts
          .map((part) => encodeURIComponent(part))
          .join('/')}`;
        return parsed.toString();
      } catch {
        return url;
      }
    },
  },
};
</script>

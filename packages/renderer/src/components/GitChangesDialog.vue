<template>
  <q-dialog :model-value="visible" @hide="$emit('close')">
    <q-card style="min-width: 34rem">
      <q-card-section class="text-h6">{{ $t('gitChangesDialog.title') }}</q-card-section>
      <q-card-section v-if="!status.managed">
        {{ $t('gitChangesDialog.notManaged') }}
      </q-card-section>
      <q-card-section v-else>
        <q-list bordered separator>
          <q-item v-for="file in status.files" :key="file.path">
            <q-item-section avatar>
              <q-checkbox v-model="selected" :val="file.path" />
            </q-item-section>
            <q-item-section>{{ file.path }}</q-item-section>
            <q-item-section side>{{ file.indexStatus }}{{ file.worktreeStatus }}</q-item-section>
          </q-item>
          <q-item v-if="!status.files.length"><q-item-section>{{ $t('gitChangesDialog.noChanges') }}</q-item-section></q-item>
        </q-list>
        <q-input v-model="message" class="q-mt-md" :label="$t('gitChangesDialog.commitMessage')" outlined />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-if="!status.managed" :label="$t('gitChangesDialog.initialize')" color="primary" @click="initialize" />
        <q-btn v-else :label="$t('gitChangesDialog.stageSelected')" :disable="!selected.length" @click="stage" />
        <q-btn v-if="status.managed" :label="$t('gitChangesDialog.commit')" color="primary" :disable="!message.trim()" @click="commit" />
        <q-btn :label="$t('gitChangesDialog.close')" @click="$emit('close')" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { mapState } from 'pinia';
import { useBackend } from '../stores';
import type { GitProjectStatus } from '../common';

export default {
  props: { visible: Boolean, projectPath: { type: String, required: true } },
  emits: ['close'],
  data() {
    return {
      status: { managed: false, files: [] } as GitProjectStatus,
      selected: [] as string[],
      message: '',
    };
  },
  computed: { ...mapState(useBackend, ['backend']) },
  watch: {
    visible(value: boolean) { if (value) this.refresh(); },
  },
  methods: {
    async refresh() {
      if (this.backend) this.status = await this.backend.gitProjectStatus(this.projectPath);
    },
    async initialize() {
      await this.backend?.initGitProject(this.projectPath);
      await this.refresh();
    },
    async stage() {
      await this.backend?.stageGitProject(this.projectPath, this.selected);
      this.selected = [];
      await this.refresh();
    },
    async commit() {
      if (!this.backend) return;
      await this.backend.commitGitProject({ projectPath: this.projectPath, message: this.message });
      this.message = '';
      await this.refresh();
    },
  },
};
</script>
